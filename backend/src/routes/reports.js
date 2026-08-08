import { Router } from "express";
import { db } from "../db.js";
import { asyncHandler } from "../asyncHandler.js";

const router = Router();

// Türkiye sabit UTC+3 (DST yok). Hafta, SQLite'ın Pazartesi başlangıçlı
// %Y-%W bucket'ı ile belirlenir.
router.get(
  "/weekly-summary",
  asyncHandler(async (_req, res) => {
    const salesResult = await db.execute(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM sales
      WHERE strftime('%Y-%W', datetime(created_at, '+3 hours')) = strftime('%Y-%W', datetime('now', '+3 hours'))
    `);
    const returnsResult = await db.execute(`
      SELECT COALESCE(SUM(total), 0) as total
      FROM returns
      WHERE strftime('%Y-%W', datetime(created_at, '+3 hours')) = strftime('%Y-%W', datetime('now', '+3 hours'))
    `);
    const topProductsResult = await db.execute(`
      SELECT p.name, p.size, p.color, SUM(si.quantity) as quantity
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE strftime('%Y-%W', datetime(s.created_at, '+3 hours')) = strftime('%Y-%W', datetime('now', '+3 hours'))
      GROUP BY si.product_id
      ORDER BY quantity DESC
      LIMIT 3
    `);

    const sales = salesResult.rows[0];
    const returned = returnsResult.rows[0].total;

    res.json({
      total: sales.total - returned,
      count: sales.count,
      returned,
      topProducts: topProductsResult.rows,
    });
  })
);

export default router;
