import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentUser, logoutUser } from "../services/api";
import { useLanguage } from "../i18n/LanguageContext";

// If the first session check takes longer than this, the free-tier server is probably cold-starting.
const WAKING_NOTICE_MS = 3500;

// The session lives in an httpOnly cookie that JavaScript cannot read,
// so the logged-in user is fetched from /api/auth/me and shared through this context.
const AuthContext = createContext({
  user: null, loading: true, waking: false, refresh: async () => {}, logout: async () => {}, setUser: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState(false);
  const { setLanguage } = useLanguage();

  const refresh = useCallback(async () => {
    const timer = setTimeout(() => setWaking(true), WAKING_NOTICE_MS);
    try {
      const current = await getCurrentUser();
      setUser(current);
      // A language chosen in the profile follows the user across devices.
      if (current?.language) setLanguage(current.language);
    } catch {
      setUser(null);
    } finally {
      clearTimeout(timer);
      setWaking(false);
      setLoading(false);
    }
  }, [setLanguage]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    setUser(null);
  }, []);

  useEffect(() => {
    // Older versions kept the JWT in localStorage; remove any leftover copy.
    try {
      localStorage.removeItem("cropmind_token");
    } catch {
      // storage unavailable
    }
    refresh();
    // The API client fires this when a request comes back 401 (expired or revoked session).
    window.addEventListener("auth-change", refresh);
    return () => window.removeEventListener("auth-change", refresh);
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, waking, refresh, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
