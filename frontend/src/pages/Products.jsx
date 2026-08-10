import { useEffect, useState } from "react";
import { api } from "../api.js";
import { resizeImageFile } from "../imageResize.js";
import { printOnLocalAgent } from "../printAgent.js";

const emptyForm = { name: "", category: "", barcode: "", size: "", color: "", price: "", quantity: "", image: "" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [adjustAmounts, setAdjustAmounts] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [printerType, setPrinterType] = useState("zpl");
  const [printResults, setPrintResults] = useState([]);
  const [printing, setPrinting] = useState(false);

  async function load(searchTerm = "") {
    const data = await api.listProducts(searchTerm ? { search: searchTerm } : {});
    setProducts(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleFormImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const image = await resizeImageFile(file);
      setForm((prev) => ({ ...prev, image }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRowImageChange(id, e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    try {
      const image = await resizeImageFile(file);
      await api.uploadProductImage(id, image);
      load(search);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createProduct({
        ...form,
        price: Number(form.price),
        quantity: form.quantity ? Number(form.quantity) : 0,
      });
      setForm(emptyForm);
      load(search);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAdjust(id, delta) {
    try {
      await api.adjustStock(id, delta);
      load(search);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleBulkAdjust(id, sign) {
    const amount = Number(adjustAmounts[id]);
    if (!amount || amount <= 0) {
      setError("Önce geçerli bir adet girin");
      return;
    }
    await handleAdjust(id, sign * amount);
    setAdjustAmounts((prev) => ({ ...prev, [id]: "" }));
  }

  async function handleDelete(id) {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    await api.deleteProduct(id);
    load(search);
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handlePrint() {
    setError("");
    setPrintResults([]);
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
      setPrintResults(withStatus);
    } catch (err) {
      setError(err.message);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div>
      <h1>Ürün / Stok Yönetimi</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Ürün adı"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Kategori"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <input
          placeholder="Beden"
          value={form.size}
          onChange={(e) => setForm({ ...form, size: e.target.value })}
        />
        <input
          placeholder="Renk"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />
        <input
          placeholder="Fiyat"
          type="number"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <input
          placeholder="Stok adedi"
          type="number"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
        <input
          placeholder="Barkod (boş bırakılırsa otomatik)"
          value={form.barcode}
          onChange={(e) => setForm({ ...form, barcode: e.target.value })}
        />
        <label className="file-input-label">
          {form.image ? "Fotoğraf seçildi ✓" : "Fotoğraf seç"}
          <input type="file" accept="image/*" onChange={handleFormImageChange} hidden />
        </label>
        <button type="submit">Ürün Ekle</button>
      </form>

      <input
        placeholder="Ara (isim veya barkod)"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          load(e.target.value);
        }}
        style={{ marginBottom: 12, width: "100%" }}
      />

      <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Foto</th>
            <th>Ad</th>
            <th>Kategori</th>
            <th>Beden</th>
            <th>Renk</th>
            <th>Barkod</th>
            <th>Fiyat</th>
            <th>Stok</th>
            <th>Stok Düzelt</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelected(p.id)} />
              </td>
              <td>
                <label className="product-thumb-label">
                  {p.image ? (
                    <img className="product-thumb" src={p.image} alt={p.name} />
                  ) : (
                    <span className="product-thumb product-thumb-empty">Foto yok</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleRowImageChange(p.id, e)}
                    hidden
                  />
                </label>
              </td>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td>{p.size}</td>
              <td>{p.color}</td>
              <td>{p.barcode}</td>
              <td>{p.price.toFixed(2)} TL</td>
              <td>{p.quantity}</td>
              <td>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="number"
                    min="1"
                    placeholder="adet"
                    style={{ width: 60 }}
                    value={adjustAmounts[p.id] || ""}
                    onChange={(e) => setAdjustAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  />
                  <button className="secondary" onClick={() => handleBulkAdjust(p.id, -1)}>Düş</button>
                  <button className="secondary" onClick={() => handleBulkAdjust(p.id, 1)}>Ekle</button>
                </div>
              </td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="secondary" onClick={() => handleAdjust(p.id, 1)}>+1</button>
                  <button className="secondary" onClick={() => handleAdjust(p.id, -1)}>-1</button>
                  <button className="secondary" onClick={() => handleDelete(p.id)}>Sil</button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={11}>Henüz ürün yok.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <h1 style={{ marginTop: 32 }}>Fiyat Etiketi Basımı</h1>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <select value={printerType} onChange={(e) => setPrinterType(e.target.value)}>
          <option value="zpl">Zebra (termal) yazıcı</option>
          <option value="generic">Diğer yazıcı (A4/etiket kağıdı)</option>
        </select>
        <button onClick={handlePrint} disabled={selected.size === 0 || printing}>
          {printing ? "Yazdırılıyor..." : `Seçilenleri Yazdır (${selected.size})`}
        </button>
      </div>

      {printResults.length > 0 && (
        <div>
          {printResults.map((label) => (
            <div key={label.product_id} style={{ marginBottom: 12 }}>
              <strong>{label.barcode}</strong>{" "}
              {label.status === "printed" && <em>yazıcıya gönderildi ✅</em>}
              {label.status === "dryRun" && <em>(yazıcı bağlı değil, sadece önizleme)</em>}
              {label.status === "error" && <em style={{ color: "crimson" }}>{label.errorMessage}</em>}
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
