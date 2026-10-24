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
        <div className="navbar-inner">
          <Link to="/" className="nav-brand-link">
            <span className="brand-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
                <path d="M7 20h10M12 20V10M12 10a6 6 0 0 1 6-6M12 10a6 6 0 0 0-6-6"></path>
              </svg>
            </span>
            <span className="brand-text">CropMind</span>
          </Link>

          <div id="primary-navigation" className={`nav-links ${menuOpen ? "open" : ""}`}>
            <NavLink to="/" end className={linkClass}>{t("nav.home")}</NavLink>
            <NavLink to="/dashboard" className={linkClass}>{t("nav.dashboard")}</NavLink>
            <NavLink to="/advisor" className={linkClass}>{t("nav.advisor")}</NavLink>
            <NavLink to="/telemetry" className={linkClass}>{t("nav.telemetry")}</NavLink>
            {user && <NavLink to="/profile" className={linkClass}>{t("nav.profile")}</NavLink>}
            <NavLink to="/about" className={linkClass}>{t("nav.about")}</NavLink>
            {/* On small screens the account controls live inside the menu. */}
            <div className="nav-account-mobile">
              {user ? (
                <>
                  <span className="nav-user-name">{user.name || user.email}</span>
                  <button type="button" onClick={handleLogout} className="btn-secondary btn-block">{t("nav.logout")}</button>
                </>
              ) : (
                <Link to="/login" className="btn-primary btn-block">{t("nav.login")}</Link>
              )}
            </div>
          </div>

          <div className="nav-actions">
            <button type="button" className="lang-toggle" onClick={toggleLanguage} aria-label={t("lang.switchLabel")}>
              {t("lang.switchTo")}
            </button>
            <ThemeToggle />
            <div className="nav-account">
              {user ? (
                <>
                  <Link to="/profile" className="avatar-link" title={user.email} aria-label={t("nav.profile")}>
                    <span className="avatar" aria-hidden="true">{(user.name || user.email).substring(0, 1).toUpperCase()}</span>
                  </Link>
                  <button type="button" onClick={handleLogout} className="btn-ghost">{t("nav.logout")}</button>
                </>
              ) : (
                <Link to="/login" className="btn-primary btn-small">{t("nav.login")}</Link>
              )}
            </div>
            <button
              type="button"
              className="icon-button menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.menu")}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18"></path> : <path d="M4 7h16M4 12h16M4 17h16"></path>}
              </svg>
            </button>
          </div>
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
