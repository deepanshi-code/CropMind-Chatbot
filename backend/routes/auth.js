const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const db = require("../db");
const User = require("../models/User");
const { validate, schemas } = require("../middleware/validate");
const { makeLimiter } = require("../middleware/rateLimit");
const { requireAuth } = require("../middleware/auth");
const { COOKIE_NAME, issueSession, clearSession, verifySessionToken, revokeSessions } = require("../services/session");
const { FRONTEND_URL, hasGoogleKeys, isProduction } = require("../config");

const router = express.Router();

// The sandbox signs anyone in as any email without a password. It is only allowed in development
// AND only against the in-memory database, so it can never be used on real accounts.
// Render sets RENDER=true on every service, so a deployed server never offers the sandbox
// even if NODE_ENV was not set to production.
const sandboxConfigured = !hasGoogleKeys && !isProduction && !process.env.RENDER;
const sandboxAvailable = () => sandboxConfigured && db.isMock();

const FIFTEEN_MIN = 15 * 60 * 1000;
// Per-IP limits are generous because many farmers may share one network; the per-account
// limit is what actually stops password guessing against a single email.
const loginIpLimiter = makeLimiter("login-ip", {
  windowMs: FIFTEEN_MIN, max: 30, key: "ip",
  message: "Too many login attempts from this network, please try again in 15 minutes.",
});
const loginAccountLimiter = makeLimiter("login-account", {
  windowMs: FIFTEEN_MIN, max: 10, key: "email",
  message: "Too many login attempts for this account, please try again in 15 minutes.",
});
const registerLimiter = makeLimiter("register-ip", {
  windowMs: 60 * 60 * 1000, max: 10, key: "ip",
  message: "Too many registrations from this network, please try again in an hour.",
});

// Compared against when the email is unknown, so both failure cases take the same time
// and response timing does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser-not-a-password", 10);

// After OAuth the session cookie is already set, so no token ever appears in a URL.
const finishOAuth = (res, user) => {
  issueSession(res, user);
  res.redirect(`${FRONTEND_URL}/dashboard`);
};

// OAuth-only accounts get an unguessable password hash so the password login can't be used on them.
const randomPasswordHash = () => bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

const findOrCreateOAuthUser = async (rawEmail) => {
  const email = rawEmail.trim().toLowerCase();
  if (db.isMock()) {
    const users = db.getMockUsers();
    let user = users.find(u => u.email === email);
    if (!user) {
      user = { id: "mock-oauth-" + crypto.randomUUID(), email, password: await randomPasswordHash() };
      db.setMockUsers([user, ...users]);
    }
    return user;
  }
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, password: await randomPasswordHash() });
  }
  return user;
};

// -------------------------------------------------------------------
// PASSPORT GOOGLE STRATEGY CONFIGURATION (if keys exist)
// -------------------------------------------------------------------
if (hasGoogleKeys) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // Served through the frontend origin (Vercel / Vite proxy) so the session cookie is first-party.
        callbackURL: FRONTEND_URL + "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(null, false);
          return done(null, await findOrCreateOAuthUser(email));
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

// -------------------------------------------------------------------
// AUTHENTICATION API ENDPOINTS
// -------------------------------------------------------------------

// POST /api/auth/register
router.post("/register", registerLimiter, validate(schemas.register), async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    if (db.isMock()) {
      const users = db.getMockUsers();
      if (users.some(u => u.email === email)) {
        return res.status(400).json({ message: "Email is already registered." });
      }
      const newUser = { id: "mock-user-" + crypto.randomUUID(), email, password: hashedPassword };
      db.setMockUsers([newUser, ...users]);
      return res.status(201).json({
        message: "User registered successfully (In-Memory).",
        user: { id: newUser.id, email: newUser.email }
      });
    }

    if (await User.exists({ email })) {
      return res.status(400).json({ message: "Email is already registered." });
    }
    const user = await User.create({ email, password: hashedPassword });
    res.status(201).json({
      message: "User registered successfully.",
      user: { id: user._id, email: user.email }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// POST /api/auth/login
router.post("/login", validate(schemas.login), loginIpLimiter, loginAccountLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = db.isMock()
      ? db.getMockUsers().find(u => u.email === email)
      : await User.findOne({ email });

    const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !passwordOk) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    issueSession(res, user);
    res.status(200).json({
      message: "Login successful.",
      user: { id: String(user.id || user._id), email: user.email }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});

// GET /api/auth/me - who is logged in (the frontend cannot read the httpOnly cookie itself)
router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});

// POST /api/auth/logout - revokes every session of this user and clears the cookie
router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    const user = token ? await verifySessionToken(token) : null;
    if (user) await revokeSessions(user.id);
  } catch (error) {
    console.error("Logout error:", error);
  }
  clearSession(res);
  res.status(200).json({ message: "Logged out successfully." });
});

// -------------------------------------------------------------------
// GOOGLE OAUTH ROUTES (with development-only Sandbox Fallback)
// -------------------------------------------------------------------

// Initiate Google OAuth login
router.get("/google", (req, res, next) => {
  if (hasGoogleKeys) {
    return passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
  }
  if (sandboxAvailable()) {
    return res.redirect(FRONTEND_URL + "/api/auth/sandbox/google");
  }
  res.redirect(`${FRONTEND_URL}/login?error=GoogleNotConfigured`);
});

// Callback for Google OAuth
if (hasGoogleKeys) {
  router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: `${FRONTEND_URL}/login?error=OAuthFailed` }),
    (req, res) => finishOAuth(res, req.user)
  );
}

// -------------------------------------------------------------------
// SANDBOX SIMULATED OAUTH CONTROLLERS (development + in-memory DB only, see sandboxAvailable)
// -------------------------------------------------------------------
const sandboxRouter = express.Router();
sandboxRouter.use((req, res, next) => {
  if (!sandboxAvailable()) {
    return res.status(404).json({ message: "Route not found" });
  }
  next();
});

// Mock OAuth Consent Screen HTML page
sandboxRouter.get("/google", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CropMind - Google OAuth Sandbox</title>
      <style>
        :root {
          --bg: #050b14;
          --panel: #0b1528;
          --border: #1e2f4a;
          --accent: #00ff9d;
          --text: #c5d1e8;
          --text-muted: #6b829e;
        }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: var(--bg);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          background-color: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 32px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          text-align: center;
        }
        h2 {
          color: white;
          margin-bottom: 8px;
        }
        .badge {
          display: inline-block;
          background: rgba(0, 255, 157, 0.1);
          color: var(--accent);
          border: 1px solid rgba(0, 255, 157, 0.2);
          padding: 4px 12px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 24px;
        }
        p {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-muted);
          margin-bottom: 24px;
        }
        .user-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), #00d2ff);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #050b14;
          font-weight: bold;
        }
        .user-info {
          font-size: 14px;
        }
        .username {
          color: white;
          font-weight: 600;
        }
        .email {
          color: var(--text-muted);
          font-size: 12px;
        }
        .btn {
          display: block;
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          box-sizing: border-box;
        }
        .btn-primary {
          background-color: var(--accent);
          color: #050b14;
          margin-bottom: 12px;
          box-shadow: 0 4px 15px rgba(0, 255, 157, 0.2);
        }
        .btn-primary:hover {
          background-color: #00e087;
          transform: translateY(-1px);
        }
        .btn-secondary {
          background-color: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
        }
        .btn-secondary:hover {
          background-color: rgba(255,255,255,0.02);
          color: white;
        }
        .input-group {
          margin-bottom: 20px;
          text-align: left;
        }
        .input-label {
          display: block;
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--accent);
          background: rgba(0, 255, 157, 0.05);
          box-shadow: 0 0 10px rgba(0, 255, 157, 0.15);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Sign in with Google</h2>
        <span class="badge">Developer Sandbox Mode</span>
        <p>This is a simulated Google authorization dialog because Google Client variables are not defined in your backend <code>.env</code> file.</p>
        
        <form action="/api/auth/sandbox/google/callback" method="POST">
          <div class="input-group">
            <label class="input-label" for="sandbox-email">Google Email Address</label>
            <input 
              type="email" 
              id="sandbox-email" 
              name="email" 
              class="form-input" 
              placeholder="farmer@cropmind.com" 
              value="mock-farmer@cropmind.com" 
              required
            />
          </div>
          <button type="submit" class="btn btn-primary">Authorize & Sign In</button>
        </form>
        <a href="${FRONTEND_URL}/login?error=OAuthCancel" class="btn btn-secondary">Cancel</a>
      </div>
    </body>
    </html>
  `);
});

// POST Callback for Sandbox OAuth
sandboxRouter.post("/google/callback", loginIpLimiter, async (req, res) => {
  const parsed = schemas.login.shape.email.safeParse(req.body.email || "mock-farmer@cropmind.com");
  if (!parsed.success) {
    return res.redirect(`${FRONTEND_URL}/login?error=SandboxOAuthFailed`);
  }
  try {
    finishOAuth(res, await findOrCreateOAuthUser(parsed.data));
  } catch (err) {
    console.error("Sandbox OAuth Callback Error:", err);
    res.redirect(`${FRONTEND_URL}/login?error=SandboxOAuthFailed`);
  }
});

if (sandboxConfigured) {
  console.warn("NOTE: Google OAuth keys missing. Sandbox OAuth (password-less sign-in) is available only while using the in-memory database.");
  router.use("/sandbox", sandboxRouter);
}

module.exports = router;
