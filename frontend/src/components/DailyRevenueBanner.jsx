import { useEffect, useState } from "react";
import { api } from "../api.js";
import { OWNER_WHATSAPP, OWNER_NAME, STORE_NAME } from "../config.js";

function isToday(isoDate) {
  const date = new Date(isoDate + "Z");
  return date.toDateString() === new Date().toDateString();
}

export default function DailyRevenueBanner() {
  const [todaySales, setTodaySales] = useState(null);

  useEffect(() => {
    function refresh() {
      api.listSales().then((sales) => {
        setTodaySales(sales.filter((s) => isToday(s.created_at)));
      });
    }
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (todaySales === null) return null;
  if (!OWNER_WHATSAPP) {
    return (
      <div className="banner banner-info">
        Ciro mesajı için WhatsApp numarası tanımlı değil (frontend/.env içindeki
        VITE_OWNER_WHATSAPP).
      </div>
    );
  }

  // Ciro bilgisi ekranda gösterilmez, sadece Zuhal Hanım'a giden mesajın içine konur.
  const total = todaySales.reduce((sum, s) => sum + s.total, 0);
  const text = `Merhaba ${OWNER_NAME} Hanım, bugünkü ciro: ${total.toFixed(2)} TL (${todaySales.length} satış). Kolay gelsin — ${STORE_NAME} 💛`;
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
