const { COOKIE_NAME, verifySessionToken } = require("../services/session");

// Accepts the httpOnly session cookie (browser) or a Bearer token (scripts / devices).
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = req.cookies?.[COOKIE_NAME]
    || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

  if (!token) {
    return res.status(401).json({ message: "Access denied. Please log in." });
  }

  try {
    const user = await verifySessionToken(token);
    if (!user) {
      return res.status(401).json({ message: "Access denied. Invalid, expired or revoked session." });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Browsers cannot attach custom headers to cross-site form posts or simple requests,
// and CORS blocks them from other origins, so requiring one on state-changing
// requests stops cross-site request forgery against the session cookie.
const requireCsrfHeader = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  // Bearer-token and device-key clients don't use cookies, so they are not exposed to CSRF
  // (and a custom header like these cannot be attached to a cross-site request anyway).
  if (req.headers.authorization?.startsWith("Bearer ") || req.get("X-Device-Key")) return next();
  if (req.get("X-Requested-With") !== "CropMind") {
    return res.status(403).json({ message: "Missing CSRF header." });
  }
  next();
};

module.exports = { requireAuth, requireCsrfHeader };
