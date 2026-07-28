let nativePrinter = null;
try {
  nativePrinter = (await import("@thiagoelg/node-printer")).default;
} catch {
  console.warn(
    "[printer] '@thiagoelg/node-printer' modülü yüklenemedi (native build gerekiyor). Yazdırma istekleri sadece loglanacak."
  );
}

export function printZpl(zpl, printerName) {
  if (!nativePrinter) {
    console.log(`[printer] (dry-run, yazıcı adı: ${printerName})\n${zpl}`);
    return { dryRun: true };
  }

  nativePrinter.printDirect({
    data: zpl,
    printer: printerName,
    type: "RAW",
    success: () => console.log(`[printer] ${printerName} yazıcısına gönderildi`),
    error: (err) => console.error("[printer] Yazdırma hatası:", err),
  });

  return { dryRun: false };
}
