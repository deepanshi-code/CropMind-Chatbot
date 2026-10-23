const mongoose = require("mongoose");
const db = require("../db");
const Crop = require("../models/Crop");
const users = require("./users");
const { getWeather } = require("./weather");

const WEATHER_TIMEOUT_MS = 4000;
const DAY_MS = 24 * 3600 * 1000;

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((resolve) => setTimeout(() => resolve(null), ms)),
]);

const formatDate = (value) => new Date(value).toISOString().slice(0, 10);

async function listCrops(owner) {
  if (db.isMock()) return db.getMockCrops().filter((c) => c.owner === owner);
  return (await Crop.find({ owner }).sort({ createdAt: -1 }).limit(20)).map((c) => c.toJSON());
}

async function findCrop(owner, id) {
  if (!id) return null;
  if (db.isMock()) return db.getMockCrops().find((c) => c.owner === owner && c.id === id) || null;
  if (!mongoose.isValidObjectId(id)) return null;
  const crop = await Crop.findOne({ _id: id, owner });
  return crop ? crop.toJSON() : null;
}

const describeCrop = (crop, now = Date.now()) => {
  const parts = [`${crop.name} (${crop.season} season, ${crop.water} water need`];
  if (crop.sowingDate) {
    const days = Math.floor((now - new Date(crop.sowingDate).getTime()) / DAY_MS);
    parts.push(days >= 0 ? `, sown ${formatDate(crop.sowingDate)}, ${days} days ago` : `, planned sowing ${formatDate(crop.sowingDate)}`);
  }
  if (crop.areaAcres) parts.push(`, ${crop.areaAcres} acres`);
  parts.push(")");
  if (crop.notes) parts.push(`; farmer's notes: ${crop.notes}`);
  return parts.join("");
};

const describeSoil = (soil) => {
  if (!soil) return null;
  const nutrient = (label, value, rating) =>
    value === undefined && !rating ? null : `${label} ${value ?? "?"} kg/ha${rating ? ` (${rating} on the card)` : ""}`;
  const parts = [
    nutrient("N", soil.nitrogen, soil.nitrogenRating),
    nutrient("P", soil.phosphorus, soil.phosphorusRating),
    nutrient("K", soil.potassium, soil.potassiumRating),
    soil.ph !== undefined ? `pH ${soil.ph}` : null,
    soil.organicCarbon !== undefined ? `organic carbon ${soil.organicCarbon}%` : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return `${parts.join(", ")}${soil.testedOn ? ` (tested ${formatDate(soil.testedOn)})` : ""}`;
};

const describeWeather = (w) => {
  if (!w) return null;
  const parts = [];
  if (w.temperatureC !== null) parts.push(`${w.temperatureC}°C`);
  if (w.humidityPct !== null) parts.push(`humidity ${w.humidityPct}%`);
  if (w.soilMoisturePct !== null) parts.push(`modelled topsoil moisture ${w.soilMoisturePct}%`);
  const rain = w.rain.filter((d) => d.probabilityPct !== null)
    .map((d) => `${d.date}: ${d.probabilityPct}% chance${d.amountMm ? `, ${d.amountMm} mm` : ""}`);
  if (rain.length) parts.push(`rain outlook ${rain.join("; ")}`);
  return parts.length ? parts.join(", ") : null;
};

/**
 * Plain-text summary of what the user has told CropMind about their farm, plus current
 * modelled weather for their saved location. Returns "" when nothing is known.
 * Failures (e.g. weather service down) only drop that line; they never block the AI call.
 */
async function buildFarmContext(userId, { cropId } = {}) {
  const [profile, crops, selected] = await Promise.all([
    users.getProfile(userId),
    listCrops(userId),
    findCrop(userId, cropId),
  ]);
  if (!profile) return "";

  let weather = null;
  if (profile.location?.lat !== undefined) {
    weather = await withTimeout(
      getWeather(profile.location.lat, profile.location.lon).catch(() => null),
      WEATHER_TIMEOUT_MS
    );
  }

  const lines = [];
  if (profile.location?.name) lines.push(`Location: ${profile.location.name}, India`);
  const weatherText = describeWeather(weather);
  if (weatherText) lines.push(`Current local conditions (Open-Meteo model, not field sensors): ${weatherText}`);
  const soilText = describeSoil(profile.soilTest);
  if (soilText) lines.push(`Soil Health Card: ${soilText}`);
  if (selected) lines.push(`Crop being asked about: ${describeCrop(selected)}`);
  const others = crops.filter((c) => !selected || c.id !== selected.id).slice(0, 8);
  if (others.length) lines.push(`Other registered crops: ${others.map((c) => describeCrop(c)).join("; ")}`);
  lines.push(`Today's date: ${formatDate(Date.now())}`);

  return lines.length > 1 ? lines.join("\n") : "";
}

module.exports = { buildFarmContext, describeCrop, describeSoil, describeWeather, findCrop };
