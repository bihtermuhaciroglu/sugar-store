import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import productsRouter from "./routes/products.js";
import salesRouter from "./routes/sales.js";
import labelsRouter from "./routes/labels.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const APP_PASSWORD = process.env.APP_PASSWORD;

app.use("/api", (req, res, next) => {
  if (!APP_PASSWORD) return next();
  if (req.headers["x-app-password"] !== APP_PASSWORD) {
    return res.status(401).json({ error: "Şifre gerekli veya hatalı" });
  }
  next();
});

app.use("/api/products", productsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/labels", labelsRouter);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Bulunamadı" });
});

app.use("/api", (err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Sunucu hatası" });
});

const frontendDist = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

const port = process.env.PORT || 4100;
app.listen(port, () => {
  console.log(`Sugar Store backend çalışıyor: http://localhost:${port}`);
});
