import { useEffect, useState } from "react";
import { api } from "../api.js";
import HistoryPasswordGate from "../components/HistoryPasswordGate.jsx";

function SalesHistoryContent() {
  const [sales, setSales] = useState([]);
  const [returns, setReturns] = useState([]);

  useEffect(() => {
    api.listSalesHistory().then(setSales);
    api.listReturns().then(setReturns);
  }, []);

  return (
    <div>
      <h1>Satış Geçmişi</h1>
      <div className="table-scroll">
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

      {returns.length > 0 && (
        <>
          <h1 style={{ marginTop: 32 }}>İadeler</h1>
          <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Satış #</th>
                <th>Tarih</th>
                <th>Ürün Sayısı</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((ret) => (
                <tr key={ret.id}>
                  <td>{ret.id}</td>
                  <td>{ret.sale_id}</td>
                  <td>{new Date(ret.created_at + "Z").toLocaleString("tr-TR")}</td>
                  <td>{ret.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                  <td>-{ret.total.toFixed(2)} TL</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
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
