import { useEffect, useState } from "react";
import { api } from "../api.js";
import { OWNER_WHATSAPP, OWNER_NAME, STORE_NAME } from "../config.js";

export default function WeeklyReportBanner() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.getWeeklySummary().then(setSummary);
  }, []);

  if (summary === null || !OWNER_WHATSAPP) return null;

  const topLines = summary.topProducts
    .map((p, i) => `${i + 1}. ${[p.name, p.size, p.color].filter(Boolean).join(" - ")} (${p.quantity} adet)`)
    .join("\n");

  const text = [
    `Merhaba ${OWNER_NAME} Hanım, bu haftanın özeti:`,
    `Net ciro: ${summary.total.toFixed(2)} TL (${summary.count} satış${summary.returned > 0 ? `, ${summary.returned.toFixed(2)} TL iade düşüldü` : ""})`,
    summary.topProducts.length > 0 ? `\nEn çok satanlar:\n${topLines}` : "",
    `\nKolay gelsin — ${STORE_NAME} 💛`,
  ]
    .filter(Boolean)
    .join("\n");

  const waLink = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(text)}`;

  return (
    <div className="banner banner-info">
      Bu haftanın raporunu {OWNER_NAME} Hanım'a gönderelim mi?{" "}
      <a className="banner-link" href={waLink} target="_blank" rel="noreferrer">
        Haftalık Raporu Gönder 📊
      </a>
    </div>
  );
}
