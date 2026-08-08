import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bwipjs from "bwip-js";
import PDFDocument from "pdfkit";

// pdfkit'in yerleşik Helvetica fontu Türkçe karakterleri (ı, ğ, ş, ç vb.)
// desteklemez; bu yüzden tam Latin Extended desteği olan DejaVu Sans
// gömülü font olarak kullanılıyor.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_REGULAR = path.join(__dirname, "../node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
const FONT_BOLD = path.join(__dirname, "../node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf");

let printToWindows = null;
try {
  printToWindows = (await import("pdf-to-printer")).default;
} catch {
  console.warn(
    "[genericPrint] 'pdf-to-printer' modülü yüklenemedi. Genel yazıcı istekleri sadece dosya olarak kaydedilecek (dry-run)."
  );
}

// Kıyafet etiketi boyutu: ~50mm x 30mm (1mm ≈ 2.83pt → 142 x 85pt)
async function buildLabelPdfBuffer({ name, size, color, price, barcode }) {
  const barcodePng = await bwipjs.toBuffer({
    bcid: "code128",
    text: barcode,
    scale: 2,
    height: 8,
    includetext: true,
    textxalign: "center",
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [142, 85], margin: 4 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font(FONT_BOLD).fontSize(7).text("SugarStore", { align: "center" });
    const title = [name, size, color].filter(Boolean).join(" - ");
    doc.font(FONT_REGULAR).fontSize(6.5).text(title, { align: "center" });
    doc.font(FONT_BOLD).fontSize(11).text(`${Number(price).toFixed(2)} TL`, { align: "center" });
    doc.moveDown(0.3);
    doc.image(barcodePng, { fit: [128, 32], align: "center" });

    doc.end();
  });
}

export async function printGeneric(label, printerName) {
  const pdfBuffer = await buildLabelPdfBuffer(label);

  // pdf-to-printer sadece Windows'ta gerçekten yazdırabilir (SumatraPDF
  // kullanır); modül her platformda yüklenir ama print() çağrısı Windows
  // dışında hata verir. Bu yüzden platform dahi kontrol edilir.
  if (!printToWindows || os.platform() !== "win32") {
    const tmpPath = path.join(os.tmpdir(), `label-${label.barcode}.pdf`);
    fs.writeFileSync(tmpPath, pdfBuffer);
    console.log(`[genericPrint] (dry-run, yazıcı adı: ${printerName}) PDF kaydedildi: ${tmpPath}`);
    return { dryRun: true, savedTo: tmpPath };
  }

  const tmpPath = path.join(os.tmpdir(), `label-${label.barcode}-${Date.now()}.pdf`);
  fs.writeFileSync(tmpPath, pdfBuffer);
  try {
    await printToWindows.print(tmpPath, { printer: printerName });
    return { dryRun: false };
  } finally {
    fs.unlink(tmpPath, () => {});
  }
}
