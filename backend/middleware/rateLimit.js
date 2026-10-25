const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const mongoose = require("mongoose");
const db = require("../db");

/**
 * express-rate-limit store that keeps counters in MongoDB (so limits survive restarts and are
 * shared between server instances), with an in-memory fallback when running without a database.
 * Expired windows are removed by a TTL index on expiresAt.
 */
class HybridStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.memory = new Map();
    this.localKeys = false;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  useMongo() {
    return !db.isMock() && mongoose.connection.readyState === 1;
  }

  collection() {
    const coll = mongoose.connection.collection("ratelimits");
    if (!HybridStore.indexReady) {
      HybridStore.indexReady = coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((err) => {
        HybridStore.indexReady = null;
        console.error("Could not create rate-limit TTL index:", err.message);
      });
    }
    return coll;
  }

  async increment(key) {
    const id = `${this.prefix}:${key}`;
    const now = new Date();

    if (!this.useMongo()) {
      let entry = this.memory.get(id);
      if (!entry || entry.resetTime <= now) {
        entry = { totalHits: 0, resetTime: new Date(now.getTime() + this.windowMs) };
        this.memory.set(id, entry);
      }
      entry.totalHits += 1;
      return { ...entry };
    }

    const coll = this.collection();
    const existing = await coll.findOneAndUpdate(
      { _id: id, expiresAt: { $gt: now } },
      { $inc: { hits: 1 } },
      { returnDocument: "after" }
    );
    if (existing) {
      return { totalHits: existing.hits, resetTime: existing.expiresAt };
    }
    const resetTime = new Date(now.getTime() + this.windowMs);
    await coll.updateOne({ _id: id }, { $set: { hits: 1, expiresAt: resetTime } }, { upsert: true });
    return { totalHits: 1, resetTime };
  }

  async decrement(key) {
    const id = `${this.prefix}:${key}`;
    if (!this.useMongo()) {
      const entry = this.memory.get(id);
      if (entry) entry.totalHits = Math.max(0, entry.totalHits - 1);
      return;
    }
    await this.collection().updateOne({ _id: id }, { $inc: { hits: -1 } });
  }

  async resetKey(key) {
    const id = `${this.prefix}:${key}`;
    this.memory.delete(id);
    if (this.useMongo()) await this.collection().deleteOne({ _id: id });
  }
}

const keyBy = {
  ip: (req) => ipKeyGenerator(req.ip),
  // Per-account limits stay fair even when many users share one IP (college Wi-Fi, mobile carriers, proxies).
  user: (req) => (req.user ? `u:${req.user.id}` : ipKeyGenerator(req.ip)),
  email: (req) => `e:${String(req.body?.email || "").trim().toLowerCase()}`,
};

/**
 * @param {string} name   unique store prefix
 * @param {object} opts   { windowMs, max, message, key: "ip" | "user" | "email", skipFailed }
 *                        skipFailed: only successful (2xx/3xx) requests count toward the limit
 */
const makeLimiter = (name, { windowMs, max, message, key = "ip", skipFailed = false }) => rateLimit({
  windowMs,
  limit: max,
  message: { message },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: keyBy[key],
  store: new HybridStore(name),
  skipFailedRequests: skipFailed,
  // Fail open if the database hiccups, rather than locking every user out.
  passOnStoreError: true,
});

module.exports = { makeLimiter, HybridStore };
