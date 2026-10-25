import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loginUser, registerUser, googleLoginUrl, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { isBackendUnavailable, wakeBackend, retryDelay, sleep } from "../services/wake";

const KNOWN_ERRORS = ["OAuthCancel", "GoogleNotConfigured", "SessionExpired", "OAuthFailed"];
const MIN_PASSWORD = 8;
// The free backend can take up to a minute to wake up; say so instead of looking stuck.
const SLOW_REQUEST_MS = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SERVER_RETRIES = 2;

/** Retries a request that failed because the backend was asleep/unreachable. */
async function withServerRetries(request) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request();
    } catch (err) {
      if (!isBackendUnavailable(err) || attempt >= SERVER_RETRIES) throw err;
      wakeBackend();
      await sleep(retryDelay(attempt + 3));
    }
  }
}

/**
 * Sign-up that is safe when the server is waking up. If an attempt fails with a gateway or
 * network error we cannot know whether the account was created, so we first try to log in
 * with the same details; only if that says "wrong email or password" do we try creating again.
 * The server signs a new account in straight away.
 */
async function createAccount(email, password) {
  let lastError;
  for (let attempt = 0; attempt <= SERVER_RETRIES; attempt++) {
    try {
      return await registerUser(email, password, true);
    } catch (err) {
      lastError = err;
      const alreadyExists = err.response?.status === 400 && /already registered/i.test(err.response?.data?.message || "");
      // A previous attempt in this same submit probably created the account.
      if (alreadyExists && attempt > 0) return loginUser(email, password);
      if (!isBackendUnavailable(err)) throw err;
    }
    wakeBackend();
    await sleep(retryDelay(attempt + 3));
    try {
      return await loginUser(email, password);
    } catch (err) {
      if (err.response?.status !== 401 && !isBackendUnavailable(err)) throw err;
      lastError = err.response?.status === 401 ? lastError : err;
    }
  }
  throw lastError;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refresh } = useAuth();
  const { t } = useLanguage();

  const [mode, setMode] = useState(searchParams.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldError, setFieldError] = useState(null); // "email" | "password" | "consent"
  const errorRef = useRef(null);

  // Already signed in (e.g. after the Google OAuth redirect set the session cookie)
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const code = searchParams.get("error");
    if (code) setErrorMsg(KNOWN_ERRORS.includes(code) ? t(`login.error.${code}`) : t("login.error.generic"));
  }, [searchParams, t]);

  // Move screen readers and small screens to the message when one appears.
  useEffect(() => {
    if (errorMsg) errorRef.current?.focus();
  }, [errorMsg]);

  const isLogin = mode === "login";

  const showError = (message, field = null) => {
    setErrorMsg(message);
    setFieldError(field);
  };

  // Our own checks with visible messages. The browser's built-in validation tooltips are easy
  // to miss on phones, which made "Create Account" look like it did nothing.
  const validate = () => {
    if (!EMAIL_PATTERN.test(email.trim())) return showError(t("login.invalidEmail"), "email"), false;
    if (!password) return showError(t("login.passwordRequired"), "password"), false;
    if (!isLogin && password.length < MIN_PASSWORD) return showError(t("login.passwordTooShort"), "password"), false;
    if (!isLogin && !acceptPrivacy) return showError(t("login.consentRequired"), "consent"), false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setFieldError(null);
    if (!validate()) return;

    setLoading(true);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_REQUEST_MS);
    try {
      if (isLogin) {
        await withServerRetries(() => loginUser(email.trim(), password));
      } else {
        await createAccount(email.trim(), password);
      }
      // The server set the httpOnly session cookie; load the user into the auth context.
      await refresh();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      let fallback = isLogin ? t("login.error.generic") : t("login.error.registerGeneric");
      if (isBackendUnavailable(err)) fallback = err.response ? t("login.error.serverAsleep") : t("login.error.network");
      // Only show the server's own message when it sent one (proxy error pages have none).
      const message = isBackendUnavailable(err) ? fallback : errorMessage(err, fallback);
      showError(message, status === 400 && /email/i.test(err.response?.data?.message || "") ? "email" : null);
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(isLogin ? "register" : "login");
    setErrorMsg("");
    setFieldError(null);
  };

  return (
    <div className="page login-page">
      <div className="login-container">
        <div className="card login-card">
          <h1>{isLogin ? t("login.welcome") : t("login.create")}</h1>
          <p className="login-subtitle">{isLogin ? t("login.subtitleLogin") : t("login.subtitleRegister")}</p>

          {errorMsg && (
            <div className="state-message error-message" role="alert" tabIndex={-1} ref={errorRef}>{errorMsg}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email">{t("login.email")}</label>
              <input
                id="login-email"
                type="email"
                inputMode="email"
                placeholder="farmer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={fieldError === "email"}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">{t("login.password")}</label>
              <div className="password-field">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isLogin ? undefined : t("login.passwordHint")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  aria-invalid={fieldError === "password"}
                  aria-describedby={isLogin ? undefined : "password-hint"}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-controls="login-password"
                >
                  {showPassword ? t("login.hidePassword") : t("login.showPassword")}
                </button>
              </div>
              {!isLogin && <p id="password-hint" className="field-hint">{t("login.passwordHint")}</p>}
            </div>

            {!isLogin && (
              <label className={`consent-row ${fieldError === "consent" ? "has-error" : ""}`}>
                <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} aria-invalid={fieldError === "consent"} />
                <span>{t("login.consent")} <Link to="/privacy" target="_blank" rel="noopener">{t("login.consentLink")}</Link></span>
              </label>
            )}

            <button type="submit" className="btn-primary btn-block" disabled={loading}>
              {loading
                ? (isLogin ? t("login.loggingIn") : t("login.registering"))
                : (isLogin ? t("login.submitLogin") : t("login.submitRegister"))}
            </button>
            {slow && <p className="field-hint slow-hint" role="status">{t("login.slow")}</p>}
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
              <button type="button" className="link-button" onClick={switchMode}>
                {isLogin ? t("login.registerHere") : t("login.loginHere")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
