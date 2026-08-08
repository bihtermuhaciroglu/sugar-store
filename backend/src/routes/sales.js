import { Router } from "express";
import { db } from "../db.js";
import { asyncHandler } from "../asyncHandler.js";

const router = Router();

const HISTORY_PASSWORD = process.env.HISTORY_PASSWORD;

router.get(
  "/summary/today",
  asyncHandler(async (_req, res) => {
    // Türkiye sabit UTC+3 (DST yok), created_at UTC olarak saklanıyor
    const result = await db.execute(
      "SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM sales WHERE date(created_at, '+3 hours') = date('now', '+3 hours')"
    );
    res.json(result.rows[0]);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    if (HISTORY_PASSWORD && req.headers["x-history-password"] !== HISTORY_PASSWORD) {
      return res.status(401).json({ error: "Satış geçmişi şifresi gerekli veya hatalı" });
    }

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
        total += product.price * item.quantity;
        resolvedItems.push({ product, quantity: item.quantity });
      }

      const saleResult = await tx.execute({
        sql: "INSERT INTO sales (total, payment_method) VALUES (?, ?)",
        args: [total, payment_method],
      });
      const saleId = Number(saleResult.lastInsertRowid);

      for (const { product, quantity } of resolvedItems) {
        await tx.execute({
          sql: "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
          args: [saleId, product.id, quantity, product.price],
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
