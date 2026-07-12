import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginUser, registerUser } from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode: "login" or "register"
  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Handle URL tokens redirected from Google / Sandbox OAuth callback
  useEffect(() => {
    const token = searchParams.get("token");
    const oauthError = searchParams.get("error");

    if (token) {
      localStorage.setItem("cropmind_token", token);
      window.dispatchEvent(new Event("auth-change"));
      navigate("/dashboard", { replace: true });
    } else if (oauthError) {
      setErrorMsg(`Authentication failed: ${oauthError === "OAuthCancel" ? "User cancelled request" : oauthError}`);
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (mode === "login") {
        const data = await loginUser(email, password);
        localStorage.setItem("cropmind_token", data.token);
        window.dispatchEvent(new Event("auth-change"));
        navigate("/dashboard", { replace: true });
      } else {
        await registerUser(email, password);
        setSuccessMsg("Registration successful! You can now log in.");
        setMode("login");
        setPassword("");
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || "An authentication error occurred.";
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = () => {
    // Redirect browser to backend Google OAuth initiation route
    window.location.href = "http://localhost:5000/api/auth/google";
  };

  return (
    <div className="page login-page">
      <div className="login-container">
        <div className="card login-card animate-fade-in-up">
          <h1>{mode === "login" ? "Welcome Back" : "Create Account"}</h1>
          <p className="login-subtitle">
            {mode === "login" 
              ? "Access your farming portal and telemetry data" 
              : "Register below to secure your farming portal access"}
          </p>

          {errorMsg && (
            <div className="state-message error-message" style={{ margin: "16px 0", fontSize: "14px" }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="state-message success-message" style={{ margin: "16px 0", fontSize: "14px", color: "var(--accent-green)" }}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                placeholder="farmer@cropmind.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary btn-block" disabled={loading}>
              {loading 
                ? (mode === "login" ? "Authenticating..." : "Registering...") 
                : (mode === "login" ? "Authenticate Portal" : "Register Credentials")}
            </button>
          </form>

          {/* OAuth Authentication Button */}
          <div style={{ margin: "24px 0 16px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <span style={{ height: "1px", flex: 1, backgroundColor: "var(--border-color)" }}></span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase" }}>or sign in with</span>
            <span style={{ height: "1px", flex: 1, backgroundColor: "var(--border-color)" }}></span>
          </div>

          <button 
            type="button" 
            onClick={handleOAuthLogin} 
            className="btn-secondary btn-block"
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: "10px",
              padding: "12px",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              fontWeight: 700,
              backgroundColor: "rgba(255, 255, 255, 0.02)"
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12.24 10.285V13.4h6.887c-.648 2.41-2.519 4.14-5.136 4.14A5.72 5.72 0 1 1 19.68 12h3.12a8.84 8.84 0 1 0-10.56 8.84c4.68 0 8.01-3.24 8.01-7.89 0-.48-.05-.9-.15-1.3l-7.86.035z"/>
            </svg>
            Google Cloud Portal
          </button>

          <div className="login-footer" style={{ marginTop: "24px" }}>
            <p>
              {mode === "login" ? "New to the platform?" : "Already have an account?"}
              <button 
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                style={{ 
                  background: "none", 
                  border: "none", 
                  color: "var(--accent-green)", 
                  textDecoration: "underline", 
                  cursor: "pointer", 
                  fontWeight: "bold",
                  marginLeft: "5px" 
                }}
              >
                {mode === "login" ? "Register here" : "Login here"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
