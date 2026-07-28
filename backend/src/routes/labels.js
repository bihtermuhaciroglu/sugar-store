import { Router } from "express";
import { db } from "../db.js";
import { asyncHandler } from "../asyncHandler.js";

const router = Router();

export function buildLabelZpl({ name, size, color, price, barcode }) {
  const title = [name, size, color].filter(Boolean).join(" - ").slice(0, 32);
  const priceText = `${Number(price).toFixed(2)} TL`;

  return [
    "^XA",
    "^PW400",
    "^LL320",
    // SugarStore marka başlığı (Zebra yazıcılar tek renk bastığı için logo
    // yerine sade, kalın bir yazı kullanılıyor; ortalanmış)
    "^FO10,8^FB380,1,0,C,0^A0N,22,22^FDSugarStore^FS",
    "^FO20,40^A0N,24,24^FD" + title + "^FS",
    "^FO20,72^A0N,36,36^FD" + priceText + "^FS",
    "^FO20,130^BY2",
    "^BCN,80,Y,N,N",
    "^FD" + barcode + "^FS",
    "^XZ",
  ].join("\n");
}

router.post(
  "/build",
  asyncHandler(async (req, res) => {
    const { product_ids } = req.body;
    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ error: "product_ids boş olamaz" });
    }

    const labels = [];
    for (const id of product_ids) {
      const result = await db.execute({ sql: "SELECT * FROM products WHERE id = ?", args: [id] });
      const product = result.rows[0];
      if (!product) continue;
      labels.push({ product_id: id, barcode: product.barcode, zpl: buildLabelZpl(product) });
    }

    res.json({ labels });
  })
);

export default router;
