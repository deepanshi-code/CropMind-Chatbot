const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const TelemetryLog = require("../models/TelemetryLog");
const { requireAuth } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");
const { makeLimiter } = require("../middleware/rateLimit");
const { authenticateDeviceKey } = require("./devices");

const router = express.Router();

const RECENT_LIMIT = 30;
const MOCK_STORE_LIMIT = 200;

// Sensor devices send "X-Device-Key: cmd_..." (created under Profile > Sensor devices);
// browsers use the normal session. A device key never grants anything except posting logs.
const requireUserOrDevice = async (req, res, next) => {
  const deviceKey = req.get("X-Device-Key");
  if (!deviceKey) return requireAuth(req, res, next);
  try {
    const device = await authenticateDeviceKey(deviceKey);
    if (!device) return res.status(401).json({ message: "Invalid or revoked device key." });
    req.user = { id: device.owner };
    req.device = device;
    next();
  } catch (error) {
    next(error);
  }
};

// GET the logged-in user's most recent telemetry logs (oldest first)
router.get("/", requireAuth, async (req, res) => {
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

// POST a new telemetry log, from a sensor device (X-Device-Key) or a logged-in user
router.post(
  "/",
  requireUserOrDevice,
  makeLimiter("telemetry-post", { windowMs: 60 * 1000, max: 60, key: "user", message: "Too many telemetry logs, please slow down." }),
  validate(schemas.telemetry),
  async (req, res) => {
    try {
      const data = { ...req.body, owner: req.user.id, source: req.device?.deviceName };

      if (db.isMock()) {
        const newLog = { id: "mock-log-" + crypto.randomUUID(), ...data, createdAt: new Date() };
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
