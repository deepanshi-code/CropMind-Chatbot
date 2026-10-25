const mongoose = require("mongoose");
const db = require("../db");
const User = require("../models/User");
const Crop = require("../models/Crop");
const TelemetryLog = require("../models/TelemetryLog");
const { diagnoses, chatMessages, devices } = require("./collections");

const PROFILE_FIELDS = ["name", "language", "location", "soilTest", "authProvider", "privacyAcceptedAt", "createdAt"];

const toProfile = (user) => {
  if (!user) return null;
  const profile = { id: String(user.id || user._id), email: user.email };
  for (const field of PROFILE_FIELDS) {
    const value = typeof user.get === "function" ? user.get(field) : user[field];
    if (value !== undefined && value !== null) {
      profile[field] = value && typeof value.toObject === "function" ? value.toObject() : value;
    }
  }
  // MongoDB returns {} for an unset nested object; treat that as "not set".
  if (profile.location && !Number.isFinite(profile.location.lat)) delete profile.location;
  if (profile.soilTest && Object.keys(profile.soilTest).length === 0) delete profile.soilTest;
  profile.authProvider = profile.authProvider || "password";
  profile.language = profile.language || "en";
  return profile;
};

/** Full user document (including password hash) or null. */
async function findUser(id) {
  if (db.isMock()) return db.getMockUsers().find((u) => u.id === id) || null;
  if (!mongoose.isValidObjectId(id)) return null;
  return User.findById(id);
}

async function getProfile(id) {
  return toProfile(await findUser(id));
}

/** Applies a partial update. A field set to null is removed. */
async function updateUser(id, patch) {
  if (db.isMock()) {
    const user = db.getMockUsers().find((u) => u.id === id);
    if (!user) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete user[key];
      else user[key] = value;
    }
    return toProfile(user);
  }
  if (!mongoose.isValidObjectId(id)) return null;
  const set = {};
  const unset = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) unset[key] = "";
    else set[key] = value;
  }
  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;
  const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  return toProfile(user);
}

/** Everything stored about the user, for the "download my data" feature. */
async function exportUserData(id) {
  const profile = await getProfile(id);
  const crops = db.isMock()
    ? db.getMockCrops().filter((c) => c.owner === id)
    : (await Crop.find({ owner: id }).sort({ createdAt: -1 })).map((d) => d.toJSON());
  const telemetry = db.isMock()
    ? db.getMockTelemetry().filter((l) => l.owner === id)
    : (await TelemetryLog.find({ owner: id }).sort({ createdAt: -1 })).map((d) => d.toJSON());
  return {
    exportedAt: new Date().toISOString(),
    profile,
    crops,
    telemetry,
    diagnoses: await diagnoses.list(id, { limit: 10000 }),
    chatMessages: await chatMessages.list(id, { limit: 10000 }),
    devices: (await devices.list(id, { limit: 1000 })).map(({ keyHash, ...rest }) => rest),
  };
}

/** Permanently deletes the account and every record it owns. */
async function deleteUserAndData(id) {
  await Promise.all([diagnoses.removeAll(id), chatMessages.removeAll(id), devices.removeAll(id)]);
  if (db.isMock()) {
    db.setMockCrops(db.getMockCrops().filter((c) => c.owner !== id));
    db.setMockTelemetry(db.getMockTelemetry().filter((l) => l.owner !== id));
    db.setMockUsers(db.getMockUsers().filter((u) => u.id !== id));
    return;
  }
  await Promise.all([Crop.deleteMany({ owner: id }), TelemetryLog.deleteMany({ owner: id })]);
  await User.deleteOne({ _id: id });
}

module.exports = { findUser, getProfile, updateUser, exportUserData, deleteUserAndData, toProfile };
