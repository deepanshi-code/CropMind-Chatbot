import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loginUser, registerUser, googleLoginUrl, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

const KNOWN_ERRORS = ["OAuthCancel", "GoogleNotConfigured", "SessionExpired", "OAuthFailed"];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refresh } = useAuth();
  const { t } = useLanguage();

  const [mode, setMode] = useState(searchParams.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Already signed in (e.g. after the Google OAuth redirect set the session cookie)
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const code = searchParams.get("error");
    if (code) setErrorMsg(KNOWN_ERRORS.includes(code) ? t(`login.error.${code}`) : t("login.error.generic"));
  }, [searchParams, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (mode === "register" && !acceptPrivacy) {
      setErrorMsg(t("login.consentRequired"));
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await loginUser(email, password);
        // The server set the httpOnly session cookie; load the user into the auth context.
        await refresh();
        navigate("/dashboard", { replace: true });
      } else {
        await registerUser(email, password, true);
        setSuccessMsg(t("login.registered"));
        setMode("login");
        setPassword("");
      }
    } catch (err) {
      setErrorMsg(errorMessage(err, t("login.error.generic")));
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="page login-page">
      <div className="login-container">
        <div className="card login-card">
          <h1>{isLogin ? t("login.welcome") : t("login.create")}</h1>
          <p className="login-subtitle">{isLogin ? t("login.subtitleLogin") : t("login.subtitleRegister")}</p>

          {errorMsg && <div className="state-message error-message" role="alert">{errorMsg}</div>}
          {successMsg && <div className="state-message success-message" role="status">{successMsg}</div>}

          <form onSubmit={handleSubmit} noValidate={false}>
            <div className="form-group">
              <label htmlFor="login-email">{t("login.email")}</label>
              <input id="login-email" type="email" placeholder="farmer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">{t("login.password")}</label>
              <input
                id="login-password"
                type="password"
                placeholder={isLogin ? undefined : t("login.passwordHint")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={isLogin ? undefined : 8}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
              />
            </div>

            {!isLogin && (
              <label className="consent-row">
                <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} required />
                <span>{t("login.consent")} <Link to="/privacy" target="_blank" rel="noopener">{t("login.consentLink")}</Link></span>
              </label>
            )}

            <button type="submit" className="btn-primary btn-block" disabled={loading}>
              {loading
                ? (isLogin ? t("login.loggingIn") : t("login.registering"))
                : (isLogin ? t("login.submitLogin") : t("login.submitRegister"))}
            </button>
          </form>

          <div className="divider-with-text"><span>{t("login.or")}</span></div>

          <button type="button" onClick={() => { window.location.href = googleLoginUrl(); }} className="btn-secondary btn-block google-btn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M12.24 10.285V13.4h6.887c-.648 2.41-2.519 4.14-5.136 4.14A5.72 5.72 0 1 1 19.68 12h3.12a8.84 8.84 0 1 0-10.56 8.84c4.68 0 8.01-3.24 8.01-7.89 0-.48-.05-.9-.15-1.3l-7.86.035z"/>
            </svg>
            {t("login.google")}
          </button>
          <p className="fine-print">{t("login.googleNotice")} <Link to="/privacy">{t("login.consentLink")}</Link>.</p>

          <div className="login-footer">
            <p>
              {isLogin ? t("login.newHere") : t("login.haveAccount")}{" "}
              <button type="button" className="link-button" onClick={() => { setMode(isLogin ? "register" : "login"); setErrorMsg(""); }}>
                {isLogin ? t("login.registerHere") : t("login.loginHere")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
