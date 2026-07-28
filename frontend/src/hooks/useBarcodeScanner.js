import { useEffect, useRef } from "react";

const MAX_KEY_GAP_MS = 50;
const MIN_BARCODE_LENGTH = 3;

/**
 * USB barkod okuyucular klavye gibi davranır: karakterleri çok hızlı
 * (insan yazımından belirgin şekilde daha hızlı) basıp Enter ile bitirir.
 * Bu hook, o hız desenini yakalayıp normal klavye yazımından ayırt eder.
 */
export function useBarcodeScanner(onScan, { enabled = true } = {}) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e) {
      const target = e.target;
      const isTypableField =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTypableField) {
        // Odaklanmış bir form alanı zaten kendi onChange/onSubmit akışıyla barkodu işleyecek;
        // burada da işlersek aynı barkod iki kez eklenir.
        return;
      }

      const now = Date.now();
      const gap = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        const code = bufferRef.current;
        bufferRef.current = "";
        if (code.length >= MIN_BARCODE_LENGTH) {
          onScan(code);
        }
        return;
      }

      if (e.key.length !== 1) return;

      if (gap > MAX_KEY_GAP_MS) {
        bufferRef.current = "";
      }
      bufferRef.current += e.key;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan, enabled]);
}
