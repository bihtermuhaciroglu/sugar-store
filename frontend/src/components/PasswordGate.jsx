import { useEffect, useState } from "react";
import { getStoredPassword, onUnauthorized, setStoredPassword } from "../api.js";
import Logo from "./Logo.jsx";

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => Boolean(getStoredPassword()));
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return onUnauthorized(() => {
      setError("Şifre hatalı, tekrar deneyin.");
      setUnlocked(false);
    });
  }, []);

  if (unlocked) return children;

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setStoredPassword(input.trim());
    setError("");
    setUnlocked(true);
  }

  return (
    <div className="password-gate">
      <form onSubmit={handleSubmit} className="password-gate-form">
        <Logo size={96} />
        <p>Devam etmek için şifreyi girin</p>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Şifre"
        />
        <button type="submit">Giriş Yap</button>
        {error && <p className="password-gate-error">{error}</p>}
      </form>
    </div>
  );
}
