import { useEffect, useState } from "react";
import { getStoredHistoryPassword, onHistoryUnauthorized, setStoredHistoryPassword } from "../api.js";

export default function HistoryPasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => Boolean(getStoredHistoryPassword()));
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return onHistoryUnauthorized(() => {
      setError("Şifre hatalı, tekrar deneyin.");
      setUnlocked(false);
    });
  }, []);

  if (unlocked) return children;

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setStoredHistoryPassword(input.trim());
    setError("");
    setUnlocked(true);
  }

  return (
    <form onSubmit={handleSubmit} className="password-gate-form history-gate-form">
      <p>Satış geçmişini görmek için ayrı şifreyi girin</p>
      <input
        type="password"
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Satış geçmişi şifresi"
      />
      <button type="submit">Göster</button>
      {error && <p className="password-gate-error">{error}</p>}
    </form>
  );
}
