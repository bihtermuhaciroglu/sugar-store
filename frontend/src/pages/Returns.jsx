import { useState } from "react";
import { api } from "../api.js";

export default function Returns() {
  const [saleIdInput, setSaleIdInput] = useState("");
  const [sale, setSale] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLookup(e) {
    e.preventDefault();
    if (!saleIdInput.trim()) return;
    setError("");
    setSuccess("");
    setSale(null);
    try {
      const found = await api.getSaleById(saleIdInput.trim());
      setSale(found);
      setReturnQuantities({});
    } catch (err) {
      setError(err.message);
    }
  }

  function updateReturnQuantity(productId, value, max) {
    const qty = Math.max(0, Math.min(max, Number(value) || 0));
    setReturnQuantities((prev) => ({ ...prev, [productId]: qty }));
  }

  async function handleSubmitReturn() {
    const items = Object.entries(returnQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([product_id, quantity]) => ({ product_id: Number(product_id), quantity }));

    if (items.length === 0) {
      setError("İade edilecek en az bir ürün seçin");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const result = await api.createReturn(sale.id, items);
      setSuccess(`İade alındı: ${result.total.toFixed(2)} TL`);
      setSale(null);
      setSaleIdInput("");
      setReturnQuantities({});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>İade Al</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {success && <p style={{ color: "#1f9d55", fontWeight: 600 }}>{success}</p>}

      <form onSubmit={handleLookup}>
        <input
          placeholder="Satış numarası (fişteki # numara)"
          value={saleIdInput}
          onChange={(e) => setSaleIdInput(e.target.value)}
        />
        <button type="submit">Satışı Bul</button>
      </form>

      {sale && (
        <div className="cart">
          <p>
            Satış #{sale.id} — {new Date(sale.created_at + "Z").toLocaleString("tr-TR")} —{" "}
            {sale.payment_method === "cash" ? "Nakit" : "Kredi Kartı"}
          </p>
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Satılan</th>
                <th>Daha Önce İade</th>
                <th>İade Adedi</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => {
                const max = item.quantity - item.already_returned;
                return (
                  <tr key={item.product_id}>
                    <td>{item.name} {item.size} {item.color} — {item.unit_price.toFixed(2)} TL</td>
                    <td>{item.quantity}</td>
                    <td>{item.already_returned}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={max}
                        style={{ width: 70 }}
                        disabled={max === 0}
                        value={returnQuantities[item.product_id] || ""}
                        onChange={(e) => updateReturnQuantity(item.product_id, e.target.value, max)}
                      />
                      {max === 0 && <span style={{ fontSize: "0.8rem", color: "#888" }}> tamamı iade edilmiş</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button style={{ marginTop: 16 }} onClick={handleSubmitReturn} disabled={loading}>
            {loading ? "İşleniyor..." : "İadeyi Onayla"}
          </button>
        </div>
      )}
    </div>
  );
}
