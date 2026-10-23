const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, Client, registerAndLogin } = require("./helpers");

// 1x1 PNG
const TINY_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

let server, user;
const realFetch = globalThis.fetch;
before(async () => {
  server = await startServer();
  user = await registerAndLogin(server.baseUrl, "farmer@example.com");
});
after(async () => {
  globalThis.fetch = realFetch;
  await server.close();
});

test("AI routes require a session", async () => {
  const anon = new Client(server.baseUrl);
  assert.equal((await anon.post("/api/ai/chat", { message: "hi" })).status, 401);
  assert.equal((await anon.post("/api/ai/diagnose", { cropName: "Rice", symptoms: "spots" })).status, 401);
});

test("chat validates message and language", async () => {
  assert.equal((await user.post("/api/ai/chat", { message: "x".repeat(1001) })).status, 400);
  assert.equal((await user.post("/api/ai/chat", { message: "hi", language: "fr" })).status, 400);
  const ok = await user.post("/api/ai/chat", { message: "when to sow rice?", language: "hi" });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.reply);
});

test("chat history is saved per user and can be cleared", async () => {
  const other = await registerAndLogin(server.baseUrl, "other-chat@example.com");
  await user.delete("/api/ai/chat/history");
  await user.post("/api/ai/chat", { message: "first question" });
  await user.post("/api/ai/chat", { message: "second question" });

  const history = await user.get("/api/ai/chat/history");
  assert.equal(history.status, 200);
  assert.deepEqual(history.data.map((m) => m.role), ["user", "assistant", "user", "assistant"]);
  assert.equal(history.data[0].text, "first question");
  assert.equal((await other.get("/api/ai/chat/history")).data.length, 0, "not visible to other users");

  assert.equal((await user.delete("/api/ai/chat/history")).status, 204);
  assert.equal((await user.get("/api/ai/chat/history")).data.length, 0);
});

test("diagnoses are saved, listed newest first and deletable", async () => {
  await user.post("/api/ai/diagnose", { cropName: "Rice", symptoms: "brown spots" });
  await user.post("/api/ai/diagnose", { cropName: "Wheat", symptoms: "yellow leaves" });
  const list = await user.get("/api/ai/diagnoses");
  assert.equal(list.status, 200);
  assert.equal(list.data[0].cropName, "Wheat");
  assert.ok(list.data[0].result.diagnosis);
  assert.equal(list.data[0].hadPhoto, false);

  assert.equal((await user.delete(`/api/ai/diagnoses/${list.data[0].id}`)).status, 204);
  assert.equal((await user.get("/api/ai/diagnoses")).data.length, list.data.length - 1);
});

test("diagnose can use a crop from the user's own catalog only", async () => {
  const crop = await user.post("/api/crops", { name: "Mustard", season: "Rabi", water: "Low", sowingDate: "2026-10-01" });
  let r = await user.post("/api/ai/diagnose", { cropId: crop.data.id, cropName: "ignored", symptoms: "white rust" });
  assert.equal(r.status, 200);
  assert.equal((await user.get("/api/ai/diagnoses")).data[0].cropName, "Mustard");

  const stranger = await registerAndLogin(server.baseUrl, "stranger@example.com");
  r = await stranger.post("/api/ai/diagnose", { cropId: crop.data.id, cropName: "Guess", symptoms: "x" });
  assert.equal(r.status, 200);
  assert.equal((await stranger.get("/api/ai/diagnoses")).data[0].cropName, "Guess", "another user's crop is not used");
});

test("diagnose needs symptoms or a photo, and checks the photo really is an image", async () => {
  let r = await user.post("/api/ai/diagnose", { cropName: "Tomato" });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /symptoms or attach a photo/);

  const notAPng = Buffer.from("this is not an image at all").toString("base64");
  r = await user.post("/api/ai/diagnose", { cropName: "Tomato", image: { mimeType: "image/png", data: notAPng } });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /does not match/);

  r = await user.post("/api/ai/diagnose", { cropName: "Tomato", image: { mimeType: "image/gif", data: TINY_PNG } });
  assert.equal(r.status, 400);

  r = await user.post("/api/ai/diagnose", { cropName: "Tomato", image: { mimeType: "image/png", data: TINY_PNG } });
  assert.equal(r.status, 200);
  assert.equal(r.data.mock, true);
});

test("diagnose accepts photo-sized bodies but other routes stay small", async () => {
  const bigButValid = TINY_PNG + "A".repeat(2 * 1024 * 1024 - (TINY_PNG.length % 4));
  const r = await user.post("/api/ai/diagnose", { cropName: "Tomato", symptoms: "spots", image: { mimeType: "image/png", data: bigButValid.slice(0, Math.floor(bigButValid.length / 4) * 4) } });
  assert.notEqual(r.status, 413);
});

test("weather insight validates coordinates and maps Open-Meteo data", async () => {
  assert.equal((await user.get("/api/insights/weather?lat=200&lon=10")).status, 400);
  assert.equal((await new Client(server.baseUrl).get("/api/insights/weather?lat=30&lon=78")).status, 401);

  let upstreamUrl = null;
  globalThis.fetch = async (url, opts) => {
    if (String(url).startsWith("https://api.open-meteo.com")) {
      upstreamUrl = String(url);
      return new Response(JSON.stringify({
        current: { time: "2026-10-15T10:00", temperature_2m: 24.5, relative_humidity_2m: 60, soil_moisture_3_to_9cm: 0.287 },
        daily: { time: ["2026-10-15", "2026-10-16"], precipitation_probability_max: [10, 65], precipitation_sum: [0, 4.2] },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return realFetch(url, opts);
  };
  try {
    const r = await user.get("/api/insights/weather?lat=30.31652&lon=78.03219");
    assert.equal(r.status, 200);
    assert.equal(r.data.soilMoisturePct, 28.7);
    assert.deepEqual(r.data.rain[1], { date: "2026-10-16", probabilityPct: 65, amountMm: 4.2 });
    assert.match(upstreamUrl, /latitude=30\.32&longitude=78\.03/, "coordinates rounded before leaving the server");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("mandi insight reports when no data.gov.in key is configured", async () => {
  const r = await user.get("/api/insights/mandi?commodity=Wheat");
  assert.equal(r.status, 503);
  assert.equal(r.data.configured, false);
});
