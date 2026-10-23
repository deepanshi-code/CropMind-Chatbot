import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";
import ThemeToggle from "./components/ThemeToggle";
import ChatAssistant from "./components/ChatAssistant";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { updateProfile } from "./services/api";

// Code splitting via Route Lazy-Loading
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Telemetry = lazy(() => import("./pages/Telemetry"));
const Advisor = lazy(() => import("./pages/Advisor"));
const About = lazy(() => import("./pages/About"));
const Login = lazy(() => import("./pages/Login"));
const Profile = lazy(() => import("./pages/Profile"));
const Privacy = lazy(() => import("./pages/Privacy"));

function LoadingScreen() {
  const { t } = useLanguage();
  return (
    <div className="loading-screen" role="status">
      <div className="spinner"></div>
      <p className="loading-text">{t("app.loading")}</p>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <AppShell />
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

const linkClass = ({ isActive }) => (isActive ? "active-link" : "");

function AppShell() {
  const { user, logout, waking } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on navigation and with Escape.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const toggleLanguage = () => {
    const next = language === "en" ? "hi" : "en";
    setLanguage(next);
    // Remember it on the account too, so it follows the user to other devices.
    if (user) updateProfile({ language: next }).catch(() => {});
  };

  return (
    <div className="app-container">
      <a href="#main-content" className="skip-link">{t("app.skip")}</a>

      <nav className="navbar" aria-label="Main">
        <div className="nav-brand">
          <Link to="/" className="nav-brand-link">
            <div className="brand-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2.5" fill="none">
                <path d="M7 20h10M12 20V10M12 10a6 6 0 0 1 6-6M12 10a6 6 0 0 0-6-6"></path>
              </svg>
            </div>
            <span className="brand-text">CropMind</span>
          </Link>
        </div>

        <div className="nav-quick">
          <button type="button" className="lang-toggle" onClick={toggleLanguage} aria-label={t("lang.switchLabel")}>
            {t("lang.switchTo")}
          </button>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            aria-label={menuOpen ? t("nav.closeMenu") : t("nav.menu")}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18"></path> : <path d="M4 7h16M4 12h16M4 17h16"></path>}
            </svg>
          </button>
        </div>

        <div id="primary-navigation" className={`nav-links ${menuOpen ? "open" : ""}`}>
          <NavLink to="/" end className={linkClass}>{t("nav.home")}</NavLink>
          <NavLink to="/dashboard" className={linkClass}>{t("nav.dashboard")}</NavLink>
          <NavLink to="/advisor" className={linkClass}>{t("nav.advisor")}</NavLink>
          <NavLink to="/telemetry" className={linkClass}>{t("nav.telemetry")}</NavLink>
          {user && <NavLink to="/profile" className={linkClass}>{t("nav.profile")}</NavLink>}
          <NavLink to="/about" className={linkClass}>{t("nav.about")}</NavLink>
          {user ? (
            <div className="nav-user-container">
              <span className="user-profile-badge" title={user.email}>
                <span className="user-avatar-icon" aria-hidden="true">👤</span>
                <span className="user-email">{user.name || user.email}</span>
              </span>
              <button type="button" onClick={handleLogout} className="nav-logout-btn">{t("nav.logout")}</button>
            </div>
          ) : (
            <NavLink to="/login" className={linkClass}>{t("nav.login")}</NavLink>
          )}
          <ThemeToggle />
        </div>
      </nav>

      {waking && (
        <div className="waking-banner" role="status">
          <span className="spinner small" aria-hidden="true"></span>
          {t("app.waking")}
        </div>
      )}

      <main id="main-content" className="main-content" tabIndex={-1}>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/telemetry" element={<ProtectedRoute><Telemetry /></ProtectedRoute>} />
            <Route path="/advisor" element={<ProtectedRoute><Advisor /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </Suspense>
      </main>

      <ChatAssistant />

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} {t("app.footer")}</p>
        <p><Link to="/privacy">{t("nav.privacy")}</Link></p>
      </footer>
    </div>
  );
}
