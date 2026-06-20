import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import About from "./pages/About";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

import { useTheme } from "./context/ThemeContext";

export default function App() {
  const { dark, toggle } = useTheme();

  return (
    <div className="app">
      <button
        className="toggle"
        onClick={toggle}
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 9999,
          cursor: "pointer"
        }}
      >
        {dark ? "☀ Light" : "🌙 Dark"}
      </button>

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}