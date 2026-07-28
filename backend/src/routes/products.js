import { Router } from "express";
import { db } from "../db.js";
import { asyncHandler } from "../asyncHandler.js";

const router = Router();

function generateBarcode(id) {
  return `SKU${String(id).padStart(8, "0")}`;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, category, size, color } = req.query;
    let sql = "SELECT * FROM products WHERE 1=1";
    const args = [];

    if (search) {
      sql += " AND (name LIKE ? OR barcode LIKE ?)";
      args.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      sql += " AND category = ?";
      args.push(category);
    }
    if (size) {
      sql += " AND size = ?";
      args.push(size);
    }
    if (color) {
      sql += " AND color = ?";
      args.push(color);
    }
    sql += " ORDER BY created_at DESC";

    const result = await db.execute({ sql, args });
    res.json(result.rows);
  })
);

router.get(
  "/low-stock",
  asyncHandler(async (req, res) => {
    const threshold = Number(req.query.threshold) || 5;
    const result = await db.execute({
      sql: "SELECT * FROM products WHERE quantity <= ? ORDER BY quantity ASC",
      args: [threshold],
    });
    res.json(result.rows);
  })
);

router.get(
  "/barcode/:barcode",
  asyncHandler(async (req, res) => {
    const result = await db.execute({
      sql: "SELECT * FROM products WHERE barcode = ?",
      args: [req.params.barcode],
    });
    const product = result.rows[0];
    if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });
    res.json(product);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, category, barcode, size, color, price, cost_price, quantity, image } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: "name ve price zorunludur" });
    }

    const insertResult = await db.execute({
      sql: `INSERT INTO products (name, category, barcode, size, color, price, cost_price, quantity, image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        name,
        category || null,
        barcode || "PENDING",
        size || null,
        color || null,
        price,
        cost_price ?? null,
        quantity ?? 0,
        image || null,
      ],
    });

    const id = Number(insertResult.lastInsertRowid);
    const finalBarcode = barcode && barcode.trim() ? barcode.trim() : generateBarcode(id);
    await db.execute({ sql: "UPDATE products SET barcode = ? WHERE id = ?", args: [finalBarcode, id] });

    if (quantity) {
      await db.execute({
        sql: "INSERT INTO stock_movements (product_id, type, quantity_delta) VALUES (?, 'initial', ?)",
        args: [id, quantity],
      });
    }

    const result = await db.execute({ sql: "SELECT * FROM products WHERE id = ?", args: [id] });
    res.status(201).json(result.rows[0]);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { name, category, barcode, size, color, price, cost_price, image } = req.body;
    const existingResult = await db.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [req.params.id],
    });
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ error: "Ürün bulunamadı" });

    await db.execute({
      sql: `UPDATE products SET name = ?, category = ?, barcode = ?, size = ?, color = ?, price = ?, cost_price = ?, image = ?
            WHERE id = ?`,
      args: [
        name ?? existing.name,
        category ?? existing.category,
        barcode ?? existing.barcode,
        size ?? existing.size,
        color ?? existing.color,
        price ?? existing.price,
        cost_price ?? existing.cost_price,
        image ?? existing.image,
        req.params.id,
      ],
    });

    const result = await db.execute({ sql: "SELECT * FROM products WHERE id = ?", args: [req.params.id] });
    res.json(result.rows[0]);
  })
);

router.post(
  "/:id/image",
  asyncHandler(async (req, res) => {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "image boş olamaz" });

    const existingResult = await db.execute({
      sql: "SELECT id FROM products WHERE id = ?",
      args: [req.params.id],
    });
    if (!existingResult.rows[0]) return res.status(404).json({ error: "Ürün bulunamadı" });

    await db.execute({
      sql: "UPDATE products SET image = ? WHERE id = ?",
      args: [image, req.params.id],
    });

    const result = await db.execute({ sql: "SELECT * FROM products WHERE id = ?", args: [req.params.id] });
    res.json(result.rows[0]);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await db.execute({ sql: "DELETE FROM products WHERE id = ?", args: [req.params.id] });
    res.status(204).end();
  })
);

router.post(
  "/:id/adjust",
  asyncHandler(async (req, res) => {
    const { delta } = req.body;
    const existingResult = await db.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [req.params.id],
    });
    const product = existingResult.rows[0];
    if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });
    if (!Number.isInteger(delta)) return res.status(400).json({ error: "delta bir tam sayı olmalı" });

    const newQuantity = product.quantity + delta;
    if (newQuantity < 0) return res.status(400).json({ error: "Stok negatif olamaz" });

    await db.execute({
      sql: "INSERT INTO stock_movements (product_id, type, quantity_delta) VALUES (?, 'adjustment', ?)",
      args: [req.params.id, delta],
    });
    await db.execute({
      sql: "UPDATE products SET quantity = ? WHERE id = ?",
      args: [newQuantity, req.params.id],
    });

    const result = await db.execute({ sql: "SELECT * FROM products WHERE id = ?", args: [req.params.id] });
    res.json(result.rows[0]);
  })
);

export default router;
