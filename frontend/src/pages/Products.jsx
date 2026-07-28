import { useEffect, useState } from "react";
import { api } from "../api.js";
import { resizeImageFile } from "../imageResize.js";

const emptyForm = { name: "", category: "", barcode: "", size: "", color: "", price: "", quantity: "", image: "" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

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

  async function handleDelete(id) {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    await api.deleteProduct(id);
    load(search);
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

      <table>
        <thead>
          <tr>
            <th>Foto</th>
            <th>Ad</th>
            <th>Kategori</th>
            <th>Beden</th>
            <th>Renk</th>
            <th>Barkod</th>
            <th>Fiyat</th>
            <th>Stok</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
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
              <td style={{ display: "flex", gap: 6 }}>
                <button className="secondary" onClick={() => handleAdjust(p.id, 1)}>+1</button>
                <button className="secondary" onClick={() => handleAdjust(p.id, -1)}>-1</button>
                <button className="secondary" onClick={() => handleDelete(p.id)}>Sil</button>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={9}>Henüz ürün yok.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
