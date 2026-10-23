const express = require("express");
const bcrypt = require("bcryptjs");
const { requireAuth } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");
const { makeLimiter } = require("../middleware/rateLimit");
const { issueSession, clearSession, revokeSessions } = require("../services/session");
const users = require("../services/users");

const router = express.Router();

router.use(requireAuth);

// Password checks are what an attacker with a stolen session would brute-force.
const sensitiveLimiter = makeLimiter("profile-sensitive", {
  windowMs: 15 * 60 * 1000, max: 10, key: "user",
  message: "Too many attempts, please try again in 15 minutes.",
});

// GET /api/profile
router.get("/", async (req, res, next) => {
  try {
    const profile = await users.getProfile(req.user.id);
    if (!profile) return res.status(404).json({ message: "Account not found." });
    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
});

// PUT /api/profile - name, language, location (null clears a field)
router.put("/", validate(schemas.profile), async (req, res, next) => {
  try {
    const patch = { ...req.body };
    if (patch.location) {
      // Store at ~1 km precision: enough for weather, without keeping the exact farm position.
      patch.location = {
        name: patch.location.name,
        lat: Number(patch.location.lat.toFixed(2)),
        lon: Number(patch.location.lon.toFixed(2)),
      };
    }
    res.status(200).json(await users.updateUser(req.user.id, patch));
  } catch (error) {
    next(error);
  }
});

// PUT /api/profile/soil-test - replaces the saved soil test
router.put("/soil-test", validate(schemas.soilTest), async (req, res, next) => {
  try {
    const soilTest = Object.fromEntries(Object.entries(req.body).filter(([, v]) => v !== undefined));
    res.status(200).json(await users.updateUser(req.user.id, { soilTest }));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/profile/soil-test
router.delete("/soil-test", async (req, res, next) => {
  try {
    res.status(200).json(await users.updateUser(req.user.id, { soilTest: null }));
  } catch (error) {
    next(error);
  }
});

// POST /api/profile/password - change (or, for Google accounts, set) the password.
// Signs out every other device and issues a fresh session for this one.
router.post("/password", sensitiveLimiter, validate(schemas.changePassword), async (req, res, next) => {
  try {
    const user = await users.findUser(req.user.id);
    if (!user) return res.status(404).json({ message: "Account not found." });

    const provider = user.authProvider || "password";
    if (provider === "password") {
      const ok = req.body.currentPassword && (await bcrypt.compare(req.body.currentPassword, user.password));
      if (!ok) return res.status(400).json({ message: "Current password is incorrect." });
    }

    await users.updateUser(req.user.id, {
      password: await bcrypt.hash(req.body.newPassword, 10),
      authProvider: "password",
    });
    await revokeSessions(req.user.id);
    issueSession(res, await users.findUser(req.user.id));
    res.status(200).json({ message: "Password updated. Other devices have been signed out." });
  } catch (error) {
    next(error);
  }
});

// GET /api/profile/export - everything stored about the user, as a JSON download
router.get("/export", async (req, res, next) => {
  try {
    const data = await users.exportUserData(req.user.id);
    res.set("Content-Disposition", 'attachment; filename="cropmind-my-data.json"');
    res.set("Cache-Control", "no-store");
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/profile - permanently delete the account and all its data
router.delete("/", sensitiveLimiter, validate(schemas.deleteAccount), async (req, res, next) => {
  try {
    const user = await users.findUser(req.user.id);
    if (!user) return res.status(404).json({ message: "Account not found." });

    const provider = user.authProvider || "password";
    const confirmed = provider === "password"
      ? await bcrypt.compare(req.body.confirmation, user.password)
      : req.body.confirmation.trim().toLowerCase() === user.email;
    if (!confirmed) {
      return res.status(400).json({
        message: provider === "password" ? "Password is incorrect." : "Type your account email exactly to confirm.",
      });
    }

    await users.deleteUserAndData(req.user.id);
    clearSession(res);
    res.status(200).json({ message: "Your account and all its data have been deleted." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
