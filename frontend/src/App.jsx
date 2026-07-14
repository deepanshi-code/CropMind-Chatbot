import React, { useState, lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from "react-router-dom";
import ThemeToggle from "./components/ThemeToggle";
import ChatAssistant from "./components/ChatAssistant";
import ProtectedRoute from "./components/ProtectedRoute";

// Code splitting via Route Lazy-Loading
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Telemetry = lazy(() => import("./pages/Telemetry"));
const Advisor = lazy(() => import("./pages/Advisor"));
const About = lazy(() => import("./pages/About"));
const Login = lazy(() => import("./pages/Login"));

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p className="loading-text">Syncing CropMind HUD Core...</p>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("cropmind_token"));

  // Synchronize authentication state across components
  useEffect(() => {
    const handleAuthChange = () => {
      setIsLoggedIn(!!localStorage.getItem("cropmind_token"));
    };
    window.addEventListener("auth-change", handleAuthChange);
    return () => window.removeEventListener("auth-change", handleAuthChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    
    // Apply theme class to document body
    if (nextTheme === "light") {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cropmind_token");
    setIsLoggedIn(false);
    window.dispatchEvent(new Event("auth-change"));
  };

  return (
    <Router>
      <div className="app-container">
        {/* Navigation Bar */}
        <nav className="navbar">
          <div className="nav-brand">
            <Link to="/" className="nav-brand-link" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="brand-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2.5" fill="none">
                  <path d="M7 20h10M12 20V10M12 10a6 6 0 0 1 6-6M12 10a6 6 0 0 0-6-6"></path>
                </svg>
              </div>
              <span className="brand-text">CropMind</span>
            </Link>
          </div>

          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => isActive ? "active-link" : ""}>Home</NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active-link" : ""}>Dashboard</NavLink>
            <NavLink to="/telemetry" className={({ isActive }) => isActive ? "active-link" : ""}>Telemetry</NavLink>
            <NavLink to="/advisor" className={({ isActive }) => isActive ? "active-link" : ""}>AI Advisor</NavLink>
            <NavLink to="/about" className={({ isActive }) => isActive ? "active-link" : ""}>About</NavLink>
            {isLoggedIn ? (
              <button 
                onClick={handleLogout} 
                className="nav-logout-btn" 
                style={{ 
                  background: "none", 
                  border: "none", 
                  color: "inherit", 
                  cursor: "pointer", 
                  font: "inherit",
                  fontSize: "14px",
                  padding: "6px 12px",
                  borderRadius: "6px"
                }}
              >
                Logout
              </button>
            ) : (
              <NavLink to="/login" className={({ isActive }) => isActive ? "active-link" : ""}>Login</NavLink>
            )}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </nav>

        {/* Main Routed Content */}
        <main className="main-content">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/telemetry" 
                element={
                  <ProtectedRoute>
                    <Telemetry />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/advisor" 
                element={
                  <ProtectedRoute>
                    <Advisor />
                  </ProtectedRoute>
                } 
              />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </Suspense>
        </main>

        {/* Floating Chatbot Assistant Widget */}
        <ChatAssistant />

        {/* Footer */}
        <footer className="footer">
          <p>&copy; {new Date().getFullYear()} CropMind Smart Farming Portal. Developed for Agriculture Telemetry.</p>
        </footer>
      </div>
    </Router>
  );
}