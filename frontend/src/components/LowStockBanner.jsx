import { useEffect, useState } from "react";
import { api } from "../api.js";
import { LOW_STOCK_THRESHOLD, OWNER_NAME } from "../config.js";

export default function LowStockBanner() {
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    function refresh() {
      api.listLowStock(LOW_STOCK_THRESHOLD).then(setLowStock);
    }
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (lowStock.length === 0) return null;

  const names = lowStock.map((p) => `${p.name} (${p.quantity} adet)`).join(", ");

  return (
    <div className="banner banner-warning">
      {OWNER_NAME}, stok tükeniyor, bana haber verirsen sevinirim 🙂 — {names}
    </div>
  );
}
