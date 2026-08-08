const PASSWORD_KEY = "sugarStorePassword";
const HISTORY_PASSWORD_KEY = "sugarStoreHistoryPassword";

const unauthorizedListeners = new Set();
const historyUnauthorizedListeners = new Set();

export function onUnauthorized(callback) {
  unauthorizedListeners.add(callback);
  return () => unauthorizedListeners.delete(callback);
}

export function onHistoryUnauthorized(callback) {
  historyUnauthorizedListeners.add(callback);
  return () => historyUnauthorizedListeners.delete(callback);
}

export function getStoredPassword() {
  return localStorage.getItem(PASSWORD_KEY) || "";
}

export function setStoredPassword(password) {
  localStorage.setItem(PASSWORD_KEY, password);
}

export function getStoredHistoryPassword() {
  return localStorage.getItem(HISTORY_PASSWORD_KEY) || "";
}

export function setStoredHistoryPassword(password) {
  localStorage.setItem(HISTORY_PASSWORD_KEY, password);
}

async function request(path, options = {}, { historyAuth = false } = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-App-Password": getStoredPassword(),
  };
  if (historyAuth) headers["X-History-Password"] = getStoredHistoryPassword();

  const res = await fetch(`/api${path}`, { headers, ...options });

  if (res.status === 401) {
    if (historyAuth) {
      historyUnauthorizedListeners.forEach((cb) => cb());
      throw new Error("Satış geçmişi şifresi gerekli veya hatalı");
    }
    unauthorizedListeners.forEach((cb) => cb());
    throw new Error("Şifre gerekli veya hatalı");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `İstek başarısız: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ""}`);
  },
  getProductByBarcode: (barcode) => request(`/products/barcode/${encodeURIComponent(barcode)}`),
  listLowStock: (threshold) => request(`/products/low-stock?threshold=${threshold}`),
  createProduct: (data) => request("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
  adjustStock: (id, delta, reason) =>
    request(`/products/${id}/adjust`, { method: "POST", body: JSON.stringify({ delta, reason }) }),
  uploadProductImage: (id, image) =>
    request(`/products/${id}/image`, { method: "POST", body: JSON.stringify({ image }) }),
  createSale: (items, payment_method) =>
    request("/sales", { method: "POST", body: JSON.stringify({ items, payment_method }) }),
  getTodaySummary: () => request("/sales/summary/today"),
  listSalesHistory: () => request("/sales", {}, { historyAuth: true }),
  buildLabels: (product_ids) =>
    request("/labels/build", { method: "POST", body: JSON.stringify({ product_ids }) }),
};
