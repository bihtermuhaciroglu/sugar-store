import { Router } from "express";
import { db } from "../db.js";
import { asyncHandler } from "../asyncHandler.js";

const router = Router();

// Kıyafet etiketi boyutu: ~50mm x 30mm (203dpi / 8 dot-mm Zebra yazıcılarda 400x240 dot)
export function buildLabelZpl({ name, size, color, price, barcode }) {
  const title = [name, size, color].filter(Boolean).join(" - ").slice(0, 28);
  const priceText = `${Number(price).toFixed(2)} TL`;

  return [
    "^XA",
    "^PW400",
    "^LL240",
    "^FO10,6^FB380,1,0,C,0^A0N,18,18^FDSugarStore^FS",
    "^FO20,28^A0N,18,18^FD" + title + "^FS",
    "^FO20,50^A0N,30,30^FD" + priceText + "^FS",
    "^FO20,90^BY2",
    "^BCN,60,Y,N,N",
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
      labels.push({
        product_id: id,
        name: product.name,
        size: product.size,
        color: product.color,
        price: product.price,
        barcode: product.barcode,
        zpl: buildLabelZpl(product),
      });
    }

    res.json({ labels });
  })
);

export default router;
