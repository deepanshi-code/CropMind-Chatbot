const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const db = require("../db");
const User = require("../models/User");
const { JWT_SECRET, JWT_EXPIRES_IN, isProduction } = require("../config");

const COOKIE_NAME = "cropmind_session";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // keep in sync with JWT_EXPIRES_IN

// httpOnly keeps the token out of reach of page JavaScript (and so of any XSS).
// The frontend and API are served from one origin (Vite / Vercel proxy), so this is a first-party cookie.
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

const userId = (user) => String(user.id || user._id);

const findUserById = async (id) => {
  if (db.isMock()) {
    return db.getMockUsers().find(u => u.id === id) || null;
  }
  if (!mongoose.isValidObjectId(id)) return null;
  return User.findById(id).select("email tokenVersion");
};

const signToken = (user) =>
  jwt.sign({ id: userId(user), email: user.email, v: user.tokenVersion || 0 }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const issueSession = (res, user) => {
  res.cookie(COOKIE_NAME, signToken(user), { ...cookieOptions, maxAge: MAX_AGE_MS });
};

const clearSession = (res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
};

// Verifies a token and checks it has not been revoked. Returns { id, email } or null.
const verifySessionToken = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
  const user = await findUserById(payload.id);
  if (!user || (user.tokenVersion || 0) !== payload.v) return null;
  return { id: userId(user), email: user.email };
};

// Logging out bumps the version, which invalidates every token issued before (all devices).
const revokeSessions = async (id) => {
  if (db.isMock()) {
    const user = db.getMockUsers().find(u => u.id === id);
    if (user) user.tokenVersion = (user.tokenVersion || 0) + 1;
    return;
  }
  if (mongoose.isValidObjectId(id)) {
    await User.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
  }
};

module.exports = { COOKIE_NAME, issueSession, clearSession, verifySessionToken, revokeSessions };
