require("dotenv").config();
const crypto = require("crypto");

const isProduction = process.env.NODE_ENV === "production";

// Never fall back to a hardcoded secret: anyone reading the public repo could forge tokens.
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (isProduction) {
    console.error("FATAL: JWT_SECRET must be set in production.");
    process.exit(1);
  }
  JWT_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("WARNING: JWT_SECRET not set. Using a random per-process secret (tokens reset on restart).");
}

const trimSlash = (url) => url.replace(/\/$/, "");

module.exports = {
  isProduction,
  JWT_SECRET,
  JWT_EXPIRES_IN: "7d",
  FRONTEND_URL: trimSlash(process.env.FRONTEND_URL || "http://localhost:5173"),
  hasGoogleKeys: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
};
