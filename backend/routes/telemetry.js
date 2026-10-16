const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const TelemetryLog = require("../models/TelemetryLog");
const { requireAuth } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");
const { makeLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.use(requireAuth);

const RECENT_LIMIT = 30;
const MOCK_STORE_LIMIT = 200;

// GET the logged-in user's most recent telemetry logs (oldest first)
router.get("/", async (req, res) => {
  try {
    if (db.isMock()) {
      const own = db.getMockTelemetry().filter(l => l.owner === req.user.id);
      return res.status(200).json(own.slice(-RECENT_LIMIT));
    }
    const logs = await TelemetryLog.find({ owner: req.user.id }).sort({ createdAt: -1 }).limit(RECENT_LIMIT);
    res.status(200).json(logs.reverse());
  } catch (error) {
    console.error("Error getting telemetry logs:", error);
    res.status(500).json({ message: "Error loading telemetry logs" });
  }
});

// POST a new telemetry log (intended for real sensor nodes acting on behalf of a user)
router.post(
  "/",
  makeLimiter("telemetry-post", { windowMs: 60 * 1000, max: 60, key: "user", message: "Too many telemetry logs, please slow down." }),
  validate(schemas.telemetry),
  async (req, res) => {
    try {
      const data = { ...req.body, owner: req.user.id };

      if (db.isMock()) {
        const newLog = { id: "mock-log-" + crypto.randomUUID(), ...data };
        // Keep the in-memory store bounded.
        db.setMockTelemetry([...db.getMockTelemetry(), newLog].slice(-MOCK_STORE_LIMIT));
        return res.status(201).json(newLog);
      }

      const log = await TelemetryLog.create(data);
      res.status(201).json(log);
    } catch (error) {
      console.error("Error creating telemetry log:", error);
      res.status(500).json({ message: "Error saving telemetry log" });
    }
  }
);

module.exports = router;
