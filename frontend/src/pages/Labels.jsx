import { useEffect, useState } from "react";
import { api } from "../api.js";
import { printOnLocalAgent } from "../printAgent.js";

export default function Labels() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [printerType, setPrinterType] = useState("zpl");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    api.listProducts().then(setProducts);
  }, []);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handlePrint() {
    setError("");
    setResults([]);
    setPrinting(true);
    try {
      const { labels } = await api.buildLabels([...selected]);

      const withStatus = [];
      for (const label of labels) {
        try {
          const outcome = await printOnLocalAgent({ printerType, zpl: label.zpl, label });
          withStatus.push({ ...label, ...outcome, status: outcome.dryRun ? "dryRun" : "printed" });
        } catch (err) {
          withStatus.push({ ...label, status: "error", errorMessage: err.message });
        }
      }
      setResults(withStatus);
    } catch (err) {
      setError(err.message);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div>
      <h1>Fiyat Etiketi Basımı</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <table>
        <thead>
          <tr>
            <th></th>
            <th>Ürün</th>
            <th>Barkod</th>
            <th>Fiyat</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
              </td>
              <td>{p.name} {p.size} {p.color}</td>
              <td>{p.barcode}</td>
              <td>{p.price.toFixed(2)} TL</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
        <select value={printerType} onChange={(e) => setPrinterType(e.target.value)}>
          <option value="zpl">Zebra (termal) yazıcı</option>
          <option value="generic">Diğer yazıcı (A4/etiket kağıdı)</option>
        </select>
        <button onClick={handlePrint} disabled={selected.size === 0 || printing}>
          {printing ? "Yazdırılıyor..." : `Seçilenleri Yazdır (${selected.size})`}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h2>Sonuç</h2>
          {results.map((label) => (
            <div key={label.product_id} style={{ marginBottom: 12 }}>
              <strong>{label.barcode}</strong>{" "}
              {label.status === "printed" && <em>yazıcıya gönderildi ✅</em>}
              {label.status === "dryRun" && <em>(yazıcı bağlı değil, sadece önizleme)</em>}
              {label.status === "error" && (
                <em style={{ color: "crimson" }}>{label.errorMessage}</em>
              )}
              {printerType === "zpl" && <pre>{label.zpl}</pre>}
              {printerType === "generic" && label.savedTo && (
                <p style={{ fontSize: "0.85rem", color: "#666" }}>Kaydedildi: {label.savedTo}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
