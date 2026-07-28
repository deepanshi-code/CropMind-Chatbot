const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const rateLimit = require("express-rate-limit");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const db = require("../db");
const User = require("../models/User");

const router = express.Router();

// Define JWT Secret fallback
const JWT_SECRET = process.env.JWT_SECRET || "fallback_dev_secret_key_cropmind";

// Rate limiting middleware: 5 requests per 1 minute
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 5,
  message: { message: "Too many attempts from this IP, please try again after 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Zod schemas for input validation
const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email format." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

// Input validation middleware using Zod
const validateAuthBody = (req, res, next) => {
  try {
    authSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues || error.errors || [];
      const errorMsg = issues.map(err => err.message).join(" ");
      return res.status(400).json({ message: errorMsg || "Invalid input parameters." });
    }
    next(error);
  }
};

// -------------------------------------------------------------------
// PASSPORT GOOGLE STRATEGY CONFIGURATION (if keys exist)
// -------------------------------------------------------------------
const hasGoogleKeys = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (hasGoogleKeys) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: (process.env.BACKEND_URL || "http://localhost:5000") + "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          let user;

          if (db.isMock()) {
            const users = db.getMockUsers();
            user = users.find(u => u.email === email);
            if (!user) {
              user = {
                id: "mock-oauth-" + Date.now(),
                email,
                password: await bcrypt.hash(Math.random().toString(36), 10),
              };
              db.setMockUsers([user, ...users]);
            }
          } else {
            user = await User.findOne({ email });
            if (!user) {
              // Create user with a random secure password
              const randomPass = Math.random().toString(36) + Math.random().toString(36);
              const hashedPassword = await bcrypt.hash(randomPass, 10);
              user = await User.create({ email, password: hashedPassword });
            }
          }
          return done(null, user);
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
router.post("/register", authLimiter, validateAuthBody, async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Check if user already exists
    if (db.isMock()) {
      const users = db.getMockUsers();
      const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        return res.status(400).json({ message: "Email is already registered." });
      }

      // 2. Hash Password and store in-memory
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: "mock-user-" + Date.now(),
        email: email.toLowerCase(),
        password: hashedPassword
      };
      db.setMockUsers([newUser, ...users]);

      return res.status(201).json({
        message: "User registered successfully (In-Memory).",
        user: { id: newUser.id, email: newUser.email }
      });
    }

    // MongoDB path
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword
    });

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
router.post("/login", authLimiter, validateAuthBody, async (req, res) => {
  const { email, password } = req.body;

  try {
    let user;

    if (db.isMock()) {
      const users = db.getMockUsers();
      user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        // Auto-register on first login attempt for seamless developer experience
        const hashedPassword = await bcrypt.hash(password, 10);
        user = {
          id: "mock-user-" + Date.now(),
          email: email.toLowerCase(),
          password: hashedPassword
        };
        db.setMockUsers([user, ...users]);
        console.log(`[Mock DB] Auto-registered user on login: ${email}`);
      } else {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: "Invalid email or password." });
        }
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      return res.status(200).json({
        message: "Login successful (In-Memory).",
        token,
        user: { id: user.id, email: user.email }
      });
    }

    // MongoDB path
    user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.status(200).json({
      message: "Login successful.",
      token,
      user: { id: user._id, email: user.email }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.status(200).json({ message: "Logged out successfully." });
});

// -------------------------------------------------------------------
// GOOGLE OAUTH ROUTES (with Sandbox Fallback)
// -------------------------------------------------------------------

// Initiate Google OAuth login
router.get("/google", (req, res, next) => {
  if (!hasGoogleKeys) {
    // Redirect to Sandbox Simulator if Google client variables are not defined
    return res.redirect((process.env.BACKEND_URL || "http://localhost:5000") + "/api/auth/sandbox/google");
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

// Callback for Google OAuth
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: (process.env.FRONTEND_URL || "http://localhost:5173") + "/login?error=OAuthFailed" }),
  (req, res) => {
    // Generate JWT for the authenticated user and redirect
    const user = req.user;
    const token = jwt.sign({ id: user.id || user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/login?token=${token}`);
  }
);

// -------------------------------------------------------------------
// SANDBOX SIMULATED OAUTH CONTROLLERS
// -------------------------------------------------------------------

// Mock OAuth Consent Screen HTML page
router.get("/sandbox/google", (req, res) => {
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
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Sign in with Google</h2>
        <span class="badge">Developer Sandbox Mode</span>
        <p>This is a simulated Google authorization dialog because Google Client variables are not defined in your backend <code>.env</code> file.</p>
        
        <div class="user-card">
          <div class="avatar">F</div>
          <div class="user-info">
            <div class="username">Mock Farmer</div>
            <div class="email">mock-farmer@cropmind.com</div>
          </div>
        </div>
        
        <form action="/api/auth/sandbox/google/callback" method="POST">
          <button type="submit" class="btn btn-primary">Authorize CropMind Sandbox</button>
        </form>
        <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=OAuthCancel" class="btn btn-secondary">Cancel</a>
      </div>
    </body>
    </html>
  `);
});

// POST Callback for Sandbox OAuth
router.post("/sandbox/google/callback", async (req, res) => {
  const email = "mock-farmer@cropmind.com";
  try {
    let user;

    if (db.isMock()) {
      const users = db.getMockUsers();
      user = users.find(u => u.email === email);
      if (!user) {
        user = {
          id: "mock-oauth-" + Date.now(),
          email,
          password: await bcrypt.hash("sandbox-oauth-pass", 10),
        };
        db.setMockUsers([user, ...users]);
      }
    } else {
      user = await User.findOne({ email });
      if (!user) {
        const hashedPassword = await bcrypt.hash("sandbox-oauth-pass", 10);
        user = await User.create({ email, password: hashedPassword });
      }
    }

    const token = jwt.sign({ id: user.id || user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/login?token=${token}`);
  } catch (err) {
    console.error("Sandbox OAuth Callback Error:", err);
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=SandboxOAuthFailed`);
  }
});

module.exports = router;
