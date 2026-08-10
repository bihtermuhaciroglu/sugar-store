import { NavLink, Route, Routes } from "react-router-dom";
import Products from "./pages/Products.jsx";
import Sale from "./pages/Sale.jsx";
import SalesHistory from "./pages/SalesHistory.jsx";
import Returns from "./pages/Returns.jsx";
import GreetingBanner from "./components/GreetingBanner.jsx";
import LowStockBanner from "./components/LowStockBanner.jsx";
import DailyRevenueBanner from "./components/DailyRevenueBanner.jsx";
import WeeklyReportBanner from "./components/WeeklyReportBanner.jsx";
import PasswordGate from "./components/PasswordGate.jsx";
import Logo from "./components/Logo.jsx";

export default function App() {
  return (
    <PasswordGate>
      <header className="store-header">
        <Logo size={40} />
      </header>
      <nav>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>Kasa</NavLink>
        <NavLink to="/products" className={({ isActive }) => (isActive ? "active" : "")}>Ürünler</NavLink>
        <NavLink to="/returns" className={({ isActive }) => (isActive ? "active" : "")}>İade Al</NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")}>Satış Geçmişi</NavLink>
      </nav>
      <main>
        <GreetingBanner />
        <LowStockBanner />
        <DailyRevenueBanner />
        <WeeklyReportBanner />
        <Routes>
          <Route path="/" element={<Sale />} />
          <Route path="/products" element={<Products />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/history" element={<SalesHistory />} />
        </Routes>
      </main>
    </PasswordGate>
  );
}
