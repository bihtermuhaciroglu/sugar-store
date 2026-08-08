import "dotenv/config";
import express from "express";
import cors from "cors";
import { printZpl } from "./printer.js";
import { printGeneric } from "./genericPrint.js";

const app = express();
app.use(cors());
app.use(express.json());

const AGENT_TOKEN = process.env.PRINT_AGENT_TOKEN;

app.use((req, res, next) => {
  if (!AGENT_TOKEN) return next();
  if (req.headers["x-agent-token"] !== AGENT_TOKEN) {
    return res.status(401).json({ error: "Geçersiz ajan token'ı" });
  }
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/print", async (req, res) => {
  const { printerType, zpl, label, printerName } = req.body;

  try {
    if (printerType === "generic") {
      if (!label) return res.status(400).json({ error: "label boş olamaz" });
      const name = printerName || process.env.GENERIC_PRINTER_NAME;
      if (!name) return res.status(400).json({ error: "GENERIC_PRINTER_NAME tanımlı değil" });
      const outcome = await printGeneric(label, name);
      return res.json({ printer: name, ...outcome });
    }

    if (!zpl) return res.status(400).json({ error: "zpl boş olamaz" });
    const name = printerName || process.env.ZPL_PRINTER_NAME || process.env.PRINTER_NAME || "ZDesigner";
    const outcome = printZpl(zpl, name);
    res.json({ printer: name, ...outcome });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 4200;
app.listen(port, () => {
  console.log(`Sugar Store print-agent çalışıyor: http://localhost:${port}`);
});
