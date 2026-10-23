const express = require("express");
const crypto = require("crypto");
const { requireAuth } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");
const { makeLimiter } = require("../middleware/rateLimit");
const { devices } = require("../services/collections");

const router = express.Router();

router.use(requireAuth);

const MAX_DEVICES = 10;
const hashKey = (key) => crypto.createHash("sha256").update(key).digest("hex");

// GET /api/devices
router.get("/", async (req, res, next) => {
  try {
    const list = await devices.list(req.user.id, { limit: MAX_DEVICES });
    res.status(200).json(list.map(({ keyHash, ...rest }) => rest));
  } catch (error) {
    next(error);
  }
});

// POST /api/devices - returns the new key ONCE; only its hash is stored.
router.post(
  "/",
  makeLimiter("device-create", { windowMs: 60 * 60 * 1000, max: 10, key: "user", message: "Too many devices created, please try again later." }),
  validate(schemas.device),
  async (req, res, next) => {
    try {
      const existing = await devices.list(req.user.id, { limit: MAX_DEVICES + 1 });
      if (existing.length >= MAX_DEVICES) {
        return res.status(400).json({ message: `You can register up to ${MAX_DEVICES} devices. Remove one first.` });
      }
      const key = `cmd_${crypto.randomBytes(24).toString("base64url")}`;
      const device = await devices.create(req.user.id, {
        name: req.body.name,
        keyHash: hashKey(key),
        keyPrefix: key.slice(0, 8),
      });
      const { keyHash, ...publicDevice } = device;
      res.status(201).json({ device: publicDevice, key });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/devices/:id - the key stops working immediately
router.delete("/:id", async (req, res, next) => {
  try {
    const removed = await devices.remove(req.user.id, req.params.id);
    if (!removed) return res.status(404).json({ message: "Device not found" });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/** Resolves an X-Device-Key header to { owner, deviceId, deviceName } or null. */
async function authenticateDeviceKey(key) {
  if (typeof key !== "string" || !key.startsWith("cmd_") || key.length > 100) return null;
  const device = await devices.findBy("keyHash", hashKey(key));
  if (!device) return null;
  await devices.touch(device.id, { lastUsedAt: new Date() });
  return { owner: device.owner, deviceId: device.id, deviceName: device.name };
}

module.exports = router;
module.exports.authenticateDeviceKey = authenticateDeviceKey;
