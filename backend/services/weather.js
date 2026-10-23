// Open-Meteo forecast and geocoding (free, no API key). Used by the dashboard widgets
// and to give the AI the user's current local conditions.

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

/**
 * Current conditions and a 3-day rain outlook. Coordinates are rounded to ~1 km first,
 * which improves cache hits and means the exact farm position never leaves the server.
 * Soil moisture is Open-Meteo's model estimate for the 3-9 cm layer, not a field sensor.
 */
async function getWeather(latitude, longitude) {
  const lat = Number(latitude).toFixed(2);
  const lon = Number(longitude).toFixed(2);
  const data = await cached(`weather:${lat},${lon}`, 30 * 60 * 1000, () => fetchJson(
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,relative_humidity_2m,soil_moisture_3_to_9cm" +
    "&daily=precipitation_probability_max,precipitation_sum" +
    "&forecast_days=3&timezone=auto"
  ));

  const soil = data.current?.soil_moisture_3_to_9cm;
  return {
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
  };
}

/** Indian places matching a name (English or Hindi), for choosing a farm location. */
async function searchPlaces(query, language = "en") {
  const q = encodeURIComponent(query.trim());
  const data = await cached(`geo:${language}:${query.trim().toLowerCase()}`, 24 * 3600 * 1000, () => fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=8&language=${language}&format=json&countryCode=IN`
  ));
  return (data.results || []).map((place) => ({
    name: [place.name, place.admin2 !== place.name ? place.admin2 : null, place.admin1].filter(Boolean).join(", "),
    lat: Number(place.latitude.toFixed(2)),
    lon: Number(place.longitude.toFixed(2)),
  }));
}

module.exports = { getWeather, searchPlaces, fetchJson, cached };
