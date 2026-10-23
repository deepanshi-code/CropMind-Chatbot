import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentUser, logoutUser } from "../services/api";

// The session lives in an httpOnly cookie that JavaScript cannot read,
// so the logged-in user is fetched from /api/auth/me and shared through this context.
const AuthContext = createContext({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await getCurrentUser());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
