const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { makeLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.use(requireAuth);
router.use(makeLimiter("insights", { windowMs: 15 * 60 * 1000, max: 60, key: "user", message: "Too many insight requests, please try again later." }));

// Tiny TTL cache so repeated dashboard loads don't hammer the free upstream APIs.
const cache = new Map();
const cached = async (key, ttlMs, load) => {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  cache.set(key, { value, expires: Date.now() + ttlMs });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return value;
};

const fetchJson = async (url, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Upstream responded ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

const coordsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

// GET /api/insights/weather?lat=..&lon=..
// Soil moisture here is Open-Meteo's model estimate for the 3-9 cm layer, not an in-field sensor reading.
router.get("/weather", async (req, res) => {
  const parsed = coordsSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Valid lat and lon query parameters are required." });
  }
  // ~1 km rounding: better cache hits, and we don't need (or store) the user's exact location.
  const lat = parsed.data.lat.toFixed(2);
  const lon = parsed.data.lon.toFixed(2);

  try {
    const data = await cached(`weather:${lat},${lon}`, 30 * 60 * 1000, () => fetchJson(
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${lat}&longitude=${lon}` +
      "&current=temperature_2m,relative_humidity_2m,soil_moisture_3_to_9cm" +
      "&daily=precipitation_probability_max,precipitation_sum" +
      "&forecast_days=3&timezone=auto"
    ));

    const soil = data.current?.soil_moisture_3_to_9cm;
    res.status(200).json({
      source: "Open-Meteo (modelled data)",
      location: { lat: Number(lat), lon: Number(lon) },
      time: data.current?.time,
      temperatureC: data.current?.temperature_2m ?? null,
      humidityPct: data.current?.relative_humidity_2m ?? null,
      // m³/m³ -> volumetric percent
      soilMoisturePct: typeof soil === "number" ? Math.round(soil * 1000) / 10 : null,
      rain: (data.daily?.time || []).map((date, i) => ({
        date,
        probabilityPct: data.daily.precipitation_probability_max?.[i] ?? null,
        amountMm: data.daily.precipitation_sum?.[i] ?? null,
      })),
    });
  } catch (error) {
    console.error("Weather insight error:", error.message);
    res.status(502).json({ message: "Weather service is unavailable right now." });
  }
});

const mandiSchema = z.object({
  commodity: z.string().trim().min(1).max(40).default("Wheat"),
  state: z.string().trim().max(40).optional(),
});

// Agmarknet "Current Daily Price of Various Commodities from Various Markets (Mandi)" on data.gov.in.
const MANDI_RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070";

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

// GET /api/insights/mandi?commodity=Wheat&state=Uttarakhand
router.get("/mandi", async (req, res) => {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ configured: false, message: "Mandi prices need DATA_GOV_API_KEY (free from data.gov.in)." });
  }
  const parsed = mandiSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid commodity or state." });
  }
  const { commodity, state } = parsed.data;

  try {
    const params = new URLSearchParams({ "api-key": apiKey, format: "json", limit: "200" });
    params.set("filters[commodity]", commodity);
    if (state) params.set("filters[state]", state);

    const data = await cached(`mandi:${commodity}:${state || ""}`, 60 * 60 * 1000, () =>
      fetchJson(`https://api.data.gov.in/resource/${MANDI_RESOURCE}?${params}`));

    const records = (data.records || [])
      .map((r) => ({
        state: r.state ?? r.State,
        district: r.district ?? r.District,
        market: r.market ?? r.Market,
        variety: r.variety ?? r.Variety,
        arrivalDate: r.arrival_date ?? r.Arrival_Date,
        modalPrice: Number(r.modal_price ?? r.Modal_Price),
      }))
      .filter((r) => Number.isFinite(r.modalPrice) && r.modalPrice > 0);

    if (records.length === 0) {
      return res.status(404).json({ message: `No recent mandi prices found for ${commodity}${state ? " in " + state : ""}.` });
    }

    res.status(200).json({
      source: "Agmarknet via data.gov.in",
      commodity,
      state: state || "All India",
      unit: "₹ per quintal",
      marketsReporting: records.length,
      medianModalPrice: median(records.map((r) => r.modalPrice)),
      latestArrivalDate: records[0].arrivalDate,
      markets: records.slice(0, 10),
    });
  } catch (error) {
    console.error("Mandi insight error:", error.message);
    res.status(502).json({ message: "Mandi price service is unavailable right now." });
  }
});

module.exports = router;
