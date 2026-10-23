const config = require("./config");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const db = require("./db");
const authRouter = require("./routes/auth");
const aiRouter = require("./routes/ai");
const cropsRouter = require("./routes/crops");
const telemetryRouter = require("./routes/telemetry");
const insightsRouter = require("./routes/insights");
const profileRouter = require("./routes/profile");
const devicesRouter = require("./routes/devices");
const { requireCsrfHeader } = require("./middleware/auth");

const app = express();
app.disable("x-powered-by");
// Number of proxies in front of the app. Rate limits key on req.ip, so this must match the
// deployment or every user shares one IP. Measured on this deployment (Oct 2026), browser
// requests arrive as: client -> Vercel rewrite -> Cloudflare -> Render internal proxy = 4 hops.
// Requests sent straight to the Render URL have fewer hops and can fake their IP; that only
// weakens the per-IP limits, the per-account and per-user limits are unaffected.
const DEFAULT_PROXY_HOPS = process.env.RENDER ? 4 : 1;
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? DEFAULT_PROXY_HOPS));
// helmet's default "no-referrer" makes browsers send "Origin: null" on form posts, which the
// CORS check below would reject; this policy still hides paths from other sites.
app.use(helmet({ referrerPolicy: { policy: "strict-origin-when-cross-origin" } }));

const allowedOrigins = [config.FRONTEND_URL, "http://localhost:5173"];

app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = origin ? origin.replace(/\/$/, "") : "";
    const isLocalDev = !config.isProduction && /^http:\/\/localhost:\d+$/.test(normalizedOrigin);
    if (!origin || allowedOrigins.includes(normalizedOrigin) || isLocalDev) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
// Small bodies everywhere except photo diagnosis, which carries a base64 image (max 4 MB binary).
const jsonSmall = express.json({ limit: "20kb" });
const jsonWithImage = express.json({ limit: "6mb" });
app.use((req, res, next) => (req.path === "/api/ai/diagnose" ? jsonWithImage : jsonSmall)(req, res, next));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl.split("?")[0]} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});
app.use(cookieParser());
app.use(passport.initialize());
// The HTML sandbox form cannot send custom headers; it is dev-only and exempt.
app.use("/api", (req, res, next) => (req.path.startsWith("/auth/sandbox/") ? next() : requireCsrfHeader(req, res, next)));

app.use("/api/auth", authRouter);
app.use("/api/ai", aiRouter);
app.use("/api/crops", cropsRouter);
app.use("/api/telemetry", telemetryRouter);
app.use("/api/insights", insightsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/devices", devicesRouter);

// Root path status check
app.get("/", (req, res) => {
  res.json({
    message: "CropMind Backend Running",
    mode: db.isMock() ? "In-Memory Mock Mode" : "MongoDB Mode"
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Same check under /api so it can be reached through the Vercel proxy. clientIp lets you verify
// TRUST_PROXY: it must show your own public IP, not a Vercel/Render address.
app.get("/api/health", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json({ status: "OK", database: db.isMock() ? "in-memory" : "mongodb", clientIp: req.ip });
});

// Status check endpoint
app.get("/status", (req, res) => {
  res.status(200).json({
    status: "online",
    mode: db.isMock() ? "mock" : "production",
    database: db.isMock() ? "disconnected" : "connected"
  });
});

// API Documentation / Info route
app.get("/docs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "docs.html"));
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Central error handler: malformed JSON, CORS rejections and anything unexpected.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Malformed JSON body." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body too large." });
  }
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "Origin not allowed." });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = app;
