import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner.js";

export default function Sale() {
  const [cart, setCart] = useState([]);
  const [manualBarcode, setManualBarcode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [lastReceipt, setLastReceipt] = useState(null);
  const inputRef = useRef(null);

  const addProductToCart = useCallback((product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const addByBarcode = useCallback(
    async (barcode) => {
      setError("");
      try {
        const product = await api.getProductByBarcode(barcode.trim());
        addProductToCart(product);
      } catch (err) {
        setError(err.message);
      }
    },
    [addProductToCart]
  );

  useBarcodeScanner(addByBarcode, { enabled: true });

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      api.listProducts({ search: searchTerm.trim() }).then(setSearchResults);
    }, 200);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  function handleSearchResultClick(product) {
    addProductToCart(product);
    setSearchTerm("");
    setSearchResults([]);
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    addByBarcode(manualBarcode);
    setManualBarcode("");
    inputRef.current?.focus();
  }

  function updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  }

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  async function handleCheckout() {
    setError("");
    try {
      const sale = await api.createSale(
        cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
        paymentMethod
      );
      setLastReceipt(sale);
      setCart([]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Kasa</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <form onSubmit={handleManualSubmit}>
        <input
          ref={inputRef}
          className="scan-input"
          placeholder="Barkod okutun ya da elle girin + Enter"
          value={manualBarcode}
          onChange={(e) => setManualBarcode(e.target.value)}
          autoFocus
        />
      </form>

      <div className="product-search">
        <input
          placeholder="Barkod okuyucu yoksa isme göre ürün ara (ör. online satış ofisi için)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchResults.length > 0 && (
          <ul className="product-search-results">
            {searchResults.map((p) => (
              <li key={p.id} onClick={() => handleSearchResultClick(p)} className="product-search-result-row">
                {p.image ? (
                  <img className="product-thumb" src={p.image} alt={p.name} />
                ) : (
                  <span className="product-thumb product-thumb-empty">Foto yok</span>
                )}
                <span>
                  {p.name} {p.size} {p.color} — {p.price.toFixed(2)} TL ({p.quantity} adet)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cart">
        <table>
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Adet</th>
              <th>Birim Fiyat</th>
              <th>Ara Toplam</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => (
              <tr key={item.product.id}>
                <td className="cart-product-cell">
                  {item.product.image ? (
                    <img className="product-thumb" src={item.product.image} alt={item.product.name} />
                  ) : (
                    <span className="product-thumb product-thumb-empty">Foto yok</span>
                  )}
                  <span>
                    {item.product.name} {item.product.size} {item.product.color}
                  </span>
                </td>
                <td>
                  <button className="secondary" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>-</button>
                  {" "}{item.quantity}{" "}
                  <button className="secondary" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>+</button>
                </td>
                <td>{item.product.price.toFixed(2)} TL</td>
                <td>{(item.product.price * item.quantity).toFixed(2)} TL</td>
                <td>
                  <button className="secondary" onClick={() => updateQuantity(item.product.id, 0)}>Çıkar</button>
                </td>
              </tr>
            ))}
            {cart.length === 0 && (
              <tr>
                <td colSpan={5}>Sepet boş. Barkod okutun ya da yukarıdan ürün arayın.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="total">Toplam: {total.toFixed(2)} TL</div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="cash">Nakit</option>
            <option value="card">Kart</option>
          </select>
          <button onClick={handleCheckout} disabled={cart.length === 0}>
            Satışı Tamamla
          </button>
        </div>
      </div>

      {lastReceipt && (
        <div style={{ marginTop: 20 }}>
          <h2>Son Satış #{lastReceipt.id}</h2>
          <p>Toplam: {lastReceipt.total.toFixed(2)} TL — {lastReceipt.payment_method === "cash" ? "Nakit" : "Kart"}</p>
        </div>
      )}
    </div>
  );
}
