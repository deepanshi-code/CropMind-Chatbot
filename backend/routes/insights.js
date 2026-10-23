const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { makeLimiter } = require("../middleware/rateLimit");
const { getWeather, searchPlaces, fetchJson, cached } = require("../services/weather");

const router = express.Router();

router.use(requireAuth);
router.use(makeLimiter("insights", { windowMs: 15 * 60 * 1000, max: 60, key: "user", message: "Too many insight requests, please try again later." }));

const coordsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

// GET /api/insights/weather?lat=..&lon=..
router.get("/weather", async (req, res) => {
  const parsed = coordsSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Valid lat and lon query parameters are required." });
  }
  try {
    res.status(200).json(await getWeather(parsed.data.lat, parsed.data.lon));
  } catch (error) {
    console.error("Weather insight error:", error.message);
    res.status(502).json({ message: "Weather service is unavailable right now." });
  }
});

const placeSchema = z.object({
  q: z.string().trim().min(2, { message: "Type at least 2 letters." }).max(60),
  lang: z.enum(["en", "hi"]).default("en"),
});

// GET /api/insights/places?q=Haridwar - district / town search for the farm location
router.get("/places", async (req, res) => {
  const parsed = placeSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  try {
    res.status(200).json(await searchPlaces(parsed.data.q, parsed.data.lang));
  } catch (error) {
    console.error("Place search error:", error.message);
    res.status(502).json({ message: "Place search is unavailable right now." });
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
