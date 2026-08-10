import { Router } from "express";
import { db } from "../db.js";
import { asyncHandler } from "../asyncHandler.js";

const router = Router();

const HISTORY_PASSWORD = process.env.HISTORY_PASSWORD;

function requireHistoryPassword(req, res) {
  if (HISTORY_PASSWORD && req.headers["x-history-password"] !== HISTORY_PASSWORD) {
    res.status(401).json({ error: "Satış geçmişi şifresi gerekli veya hatalı" });
    return false;
  }
  return true;
}

// Türkiye sabit UTC+3 (DST yok), created_at UTC olarak saklanıyor
router.get(
  "/summary/today",
  asyncHandler(async (_req, res) => {
    const salesResult = await db.execute(
      "SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM sales WHERE date(created_at, '+3 hours') = date('now', '+3 hours')"
    );
    const returnsResult = await db.execute(
      "SELECT COALESCE(SUM(total), 0) as total FROM returns WHERE date(created_at, '+3 hours') = date('now', '+3 hours')"
    );
    const sales = salesResult.rows[0];
    const returned = returnsResult.rows[0].total;
    res.json({ total: sales.total - returned, count: sales.count, returned });
  })
);

router.get(
  "/returns",
  asyncHandler(async (req, res) => {
    if (!requireHistoryPassword(req, res)) return;

    const returnsResult = await db.execute("SELECT * FROM returns ORDER BY created_at DESC");
    const withItems = await Promise.all(
      returnsResult.rows.map(async (ret) => {
        const itemsResult = await db.execute({
          sql: "SELECT * FROM return_items WHERE return_id = ?",
          args: [ret.id],
        });
        return { ...ret, items: itemsResult.rows };
      })
    );
    res.json(withItems);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!requireHistoryPassword(req, res)) return;

    const salesResult = await db.execute("SELECT * FROM sales ORDER BY created_at DESC");
    const sales = salesResult.rows;

    const withItems = await Promise.all(
      sales.map(async (sale) => {
        const itemsResult = await db.execute({
          sql: "SELECT * FROM sale_items WHERE sale_id = ?",
          args: [sale.id],
        });
        return { ...sale, items: itemsResult.rows };
      })
    );

    res.json(withItems);
  })
);

// Tek bir satışı ID ile getirir (iade akışı için) — geçmiş şifresi gerekmez,
// çünkü sadece zaten bilinen bir fiş numarasıyla sorgulanabilir, listelenemez.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const saleResult = await db.execute({ sql: "SELECT * FROM sales WHERE id = ?", args: [req.params.id] });
    const sale = saleResult.rows[0];
    if (!sale) return res.status(404).json({ error: "Satış bulunamadı" });

    const itemsResult = await db.execute({
      sql: `SELECT si.*, p.name, p.size, p.color, p.barcode
            FROM sale_items si
            JOIN products p ON p.id = si.product_id
            WHERE si.sale_id = ?`,
      args: [req.params.id],
    });

    const returnedResult = await db.execute({
      sql: `SELECT ri.product_id, SUM(ri.quantity) as returned_quantity
            FROM return_items ri
            JOIN returns r ON r.id = ri.return_id
            WHERE r.sale_id = ?
            GROUP BY ri.product_id`,
      args: [req.params.id],
    });
    const returnedByProduct = Object.fromEntries(
      returnedResult.rows.map((r) => [r.product_id, r.returned_quantity])
    );

    const items = itemsResult.rows.map((item) => ({
      ...item,
      already_returned: returnedByProduct[item.product_id] || 0,
    }));

    res.json({ ...sale, items });
  })
);

router.post(
  "/:id/return",
  asyncHandler(async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items boş olamaz" });
    }

    const tx = await db.transaction("write");
    try {
      const saleResult = await tx.execute({ sql: "SELECT * FROM sales WHERE id = ?", args: [req.params.id] });
      const sale = saleResult.rows[0];
      if (!sale) throw new Error("Satış bulunamadı");

      let refundTotal = 0;
      const resolvedItems = [];

      for (const item of items) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new Error("Geçersiz iade adedi");
        }

        const saleItemResult = await tx.execute({
          sql: "SELECT * FROM sale_items WHERE sale_id = ? AND product_id = ?",
          args: [req.params.id, item.product_id],
        });
        const saleItem = saleItemResult.rows[0];
        if (!saleItem) throw new Error(`Bu satışta ürün bulunamadı: ${item.product_id}`);

        const alreadyReturnedResult = await tx.execute({
          sql: `SELECT COALESCE(SUM(ri.quantity), 0) as qty
                FROM return_items ri
                JOIN returns r ON r.id = ri.return_id
                WHERE r.sale_id = ? AND ri.product_id = ?`,
          args: [req.params.id, item.product_id],
        });
        const alreadyReturned = alreadyReturnedResult.rows[0].qty;
        const remaining = saleItem.quantity - alreadyReturned;

        if (item.quantity > remaining) {
          throw new Error(`En fazla ${remaining} adet iade edilebilir (ürün ${item.product_id})`);
        }

        refundTotal += saleItem.unit_price * item.quantity;
        resolvedItems.push({ product_id: item.product_id, quantity: item.quantity, unit_price: saleItem.unit_price });
      }

      const returnResult = await tx.execute({
        sql: "INSERT INTO returns (sale_id, total) VALUES (?, ?)",
        args: [req.params.id, refundTotal],
      });
      const returnId = Number(returnResult.lastInsertRowid);

      for (const { product_id, quantity, unit_price } of resolvedItems) {
        await tx.execute({
          sql: "INSERT INTO return_items (return_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
          args: [returnId, product_id, quantity, unit_price],
        });
        await tx.execute({
          sql: "INSERT INTO stock_movements (product_id, type, quantity_delta) VALUES (?, 'adjustment', ?)",
          args: [product_id, quantity],
        });
        await tx.execute({
          sql: "UPDATE products SET quantity = quantity + ? WHERE id = ?",
          args: [quantity, product_id],
        });
      }

      await tx.commit();

      const returnRow = await db.execute({ sql: "SELECT * FROM returns WHERE id = ?", args: [returnId] });
      const returnItemsRow = await db.execute({
        sql: "SELECT * FROM return_items WHERE return_id = ?",
        args: [returnId],
      });
      res.status(201).json({ ...returnRow.rows[0], items: returnItemsRow.rows });
    } catch (err) {
      await tx.rollback();
      res.status(400).json({ error: err.message });
    }
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { items, payment_method } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items boş olamaz" });
    }
    if (!["cash", "card"].includes(payment_method)) {
      return res.status(400).json({ error: "payment_method 'cash' veya 'card' olmalı" });
    }

    const tx = await db.transaction("write");
    try {
      let total = 0;
      const resolvedItems = [];

      for (const item of items) {
        const productResult = await tx.execute({
          sql: "SELECT * FROM products WHERE id = ?",
          args: [item.product_id],
        });
        const product = productResult.rows[0];
        if (!product) throw new Error(`Ürün bulunamadı: ${item.product_id}`);
        if (product.quantity < item.quantity) {
          throw new Error(`Yetersiz stok: ${product.name}`);
        }

        // Kasada elle fiyat değiştirme (indirim) desteklenir — geçerli bir
        // sayı verilmişse ürünün kayıtlı fiyatı yerine o kullanılır.
        const hasCustomPrice = item.unit_price !== undefined && item.unit_price !== null;
        const unitPrice = hasCustomPrice ? Number(item.unit_price) : product.price;
        if (hasCustomPrice && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
          throw new Error(`Geçersiz fiyat: ${product.name}`);
        }

        total += unitPrice * item.quantity;
        resolvedItems.push({ product, quantity: item.quantity, unitPrice });
      }

      const saleResult = await tx.execute({
        sql: "INSERT INTO sales (total, payment_method) VALUES (?, ?)",
        args: [total, payment_method],
      });
      const saleId = Number(saleResult.lastInsertRowid);

      for (const { product, quantity, unitPrice } of resolvedItems) {
        await tx.execute({
          sql: "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
          args: [saleId, product.id, quantity, unitPrice],
        });

        await tx.execute({
          sql: "INSERT INTO stock_movements (product_id, type, quantity_delta) VALUES (?, 'sale', ?)",
          args: [product.id, -quantity],
        });

        await tx.execute({
          sql: "UPDATE products SET quantity = quantity - ? WHERE id = ?",
          args: [quantity, product.id],
        });
      }

      await tx.commit();

      const saleResultRow = await db.execute({ sql: "SELECT * FROM sales WHERE id = ?", args: [saleId] });
      const saleItemsResult = await db.execute({
        sql: "SELECT * FROM sale_items WHERE sale_id = ?",
        args: [saleId],
      });
      res.status(201).json({ ...saleResultRow.rows[0], items: saleItemsResult.rows });
    } catch (err) {
      await tx.rollback();
      res.status(400).json({ error: err.message });
    }
  })
);

export default router;
