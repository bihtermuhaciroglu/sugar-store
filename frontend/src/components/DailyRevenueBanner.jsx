import { useEffect, useState } from "react";
import { api } from "../api.js";
import { OWNER_WHATSAPP, OWNER_NAME, STORE_NAME } from "../config.js";

export default function DailyRevenueBanner() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    function refresh() {
      api.getTodaySummary().then(setSummary);
    }
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (summary === null) return null;
  if (!OWNER_WHATSAPP) {
    return (
      <div className="banner banner-info">
        Ciro mesajı için WhatsApp numarası tanımlı değil (frontend/.env içindeki
        VITE_OWNER_WHATSAPP).
      </div>
    );
  }

  // Ciro bilgisi ekranda gösterilmez, sadece Zuhal Hanım'a giden mesajın içine konur.
  const text = `Merhaba ${OWNER_NAME} Hanım, bugünkü ciro: ${summary.total.toFixed(2)} TL (${summary.count} satış). Kolay gelsin — ${STORE_NAME} 💛`;
  const waLink = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(text)}`;

  return (
    <div className="banner banner-info">
      Günün cirosunu {OWNER_NAME} Hanım'a bildirelim mi?{" "}
      <a className="banner-link" href={waLink} target="_blank" rel="noreferrer">
        {OWNER_NAME} Hanım'a Gönder 💛
      </a>
    </div>
  );
}
