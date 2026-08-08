import { useEffect, useState } from "react";
import { api } from "../api.js";
import HistoryPasswordGate from "../components/HistoryPasswordGate.jsx";

function SalesHistoryContent() {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    api.listSalesHistory().then(setSales);
  }, []);

  return (
    <div>
      <h1>Satış Geçmişi</h1>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Tarih</th>
            <th>Ürün Sayısı</th>
            <th>Ödeme</th>
            <th>Toplam</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td>{sale.id}</td>
              <td>{new Date(sale.created_at + "Z").toLocaleString("tr-TR")}</td>
              <td>{sale.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
              <td>{sale.payment_method === "cash" ? "Nakit" : "Kart"}</td>
              <td>{sale.total.toFixed(2)} TL</td>
            </tr>
          ))}
          {sales.length === 0 && (
            <tr>
              <td colSpan={5}>Henüz satış yok.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function SalesHistory() {
  return (
    <HistoryPasswordGate>
      <SalesHistoryContent />
    </HistoryPasswordGate>
  );
}
