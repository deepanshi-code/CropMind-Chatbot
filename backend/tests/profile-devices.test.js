const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, Client, registerAndLogin } = require("./helpers");
const { describeCrop, describeSoil, describeWeather } = require("../services/farmContext");

let server, user;
before(async () => {
  server = await startServer();
  user = await registerAndLogin(server.baseUrl, "profile@example.com", "original-pass-1");
});
after(async () => { await server.close(); });

test("registration requires accepting the privacy notice", async () => {
  const r = await new Client(server.baseUrl).post("/api/auth/register", { email: "noconsent@example.com", password: "long-enough-1" });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /privacy/);
});

test("profile: read, update name/language/location, location is rounded", async () => {
  let r = await user.get("/api/profile");
  assert.equal(r.status, 200);
  assert.equal(r.data.email, "profile@example.com");
  assert.equal(r.data.authProvider, "password");
  assert.ok(r.data.privacyAcceptedAt);
  assert.equal(r.data.password, undefined);

  r = await user.put("/api/profile", { name: "Asha", language: "hi", location: { name: "Haridwar, Uttarakhand", lat: 29.947913, lon: 78.160254 } });
  assert.equal(r.status, 200);
  assert.equal(r.data.name, "Asha");
  assert.equal(r.data.language, "hi");
  assert.deepEqual(r.data.location, { name: "Haridwar, Uttarakhand", lat: 29.95, lon: 78.16 });

  r = await user.put("/api/profile", { location: null });
  assert.equal(r.data.location, undefined);
  assert.equal((await user.put("/api/profile", { language: "fr" })).status, 400);
});

test("soil test: validated, saved, and cleared", async () => {
  assert.equal((await user.put("/api/profile/soil-test", {})).status, 400);
  assert.equal((await user.put("/api/profile/soil-test", { ph: 15 })).status, 400);
  assert.equal((await user.put("/api/profile/soil-test", { nitrogenRating: "Excellent" })).status, 400);

  const r = await user.put("/api/profile/soil-test", { nitrogen: "245", nitrogenRating: "Low", phosphorus: "", ph: "7.2", testedOn: "2026-03-10" });
  assert.equal(r.status, 200);
  assert.equal(r.data.soilTest.nitrogen, 245);
  assert.equal(r.data.soilTest.nitrogenRating, "Low");
  assert.equal(r.data.soilTest.phosphorus, undefined);
  assert.equal(r.data.soilTest.ph, 7.2);

  const cleared = await user.delete("/api/profile/soil-test");
  assert.equal(cleared.data.soilTest, undefined);
});

test("crops accept sowing date, area and notes", async () => {
  const r = await user.post("/api/crops", { name: "Wheat", season: "Rabi", water: "Medium", sowingDate: "2026-11-10", areaAcres: "2.5", notes: "HD-2967" });
  assert.equal(r.status, 201);
  assert.equal(r.data.areaAcres, 2.5);
  assert.equal(new Date(r.data.sowingDate).toISOString().slice(0, 10), "2026-11-10");
  assert.equal((await user.post("/api/crops", { name: "X", season: "Rabi", water: "Low", sowingDate: "not a date" })).status, 400);
  assert.equal((await user.post("/api/crops", { name: "X", season: "Rabi", water: "Low", areaAcres: -1 })).status, 400);
});

test("sensor devices: key shown once, posts telemetry, can be revoked", async () => {
  const created = await user.post("/api/devices", { name: "Field 1 probe" });
  assert.equal(created.status, 201);
  const { key, device } = created.data;
  assert.match(key, /^cmd_/);
  assert.equal(device.keyHash, undefined);

  const list = await user.get("/api/devices");
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].keyHash, undefined);

  const sensor = new Client(server.baseUrl);
  let r = await sensor.request("POST", "/api/telemetry", {
    body: { time: "06:00:00", type: "info", text: "Soil moisture 31%" },
    headers: { "X-Device-Key": key },
    csrf: false,
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.source, "Field 1 probe");
  const logs = await user.get("/api/telemetry");
  assert.ok(logs.data.some((l) => l.text === "Soil moisture 31%"));

  // A device key can only post logs, never read data.
  assert.equal((await sensor.request("GET", "/api/crops", { headers: { "X-Device-Key": key } })).status, 401);
  assert.equal((await sensor.request("POST", "/api/telemetry", {
    body: { time: "06:00:00", type: "info", text: "x" }, headers: { "X-Device-Key": "cmd_wrong" }, csrf: false,
  })).status, 401);

  assert.equal((await user.delete(`/api/devices/${device.id}`)).status, 204);
  r = await sensor.request("POST", "/api/telemetry", {
    body: { time: "06:00:00", type: "info", text: "after revoke" }, headers: { "X-Device-Key": key }, csrf: false,
  });
  assert.equal(r.status, 401);
});

test("change password: needs the current one, then old password stops working", async () => {
  let r = await user.post("/api/profile/password", { currentPassword: "wrong", newPassword: "brand-new-pass-2" });
  assert.equal(r.status, 400);
  r = await user.post("/api/profile/password", { currentPassword: "original-pass-1", newPassword: "brand-new-pass-2" });
  assert.equal(r.status, 200);
  assert.equal((await user.get("/api/auth/me")).status, 200, "this device keeps a fresh session");

  const fresh = new Client(server.baseUrl);
  assert.equal((await fresh.post("/api/auth/login", { email: "profile@example.com", password: "original-pass-1" })).status, 401);
  assert.equal((await fresh.post("/api/auth/login", { email: "profile@example.com", password: "brand-new-pass-2" })).status, 200);
});

test("export contains the user's data; delete removes the account and everything it owns", async () => {
  const victim = await registerAndLogin(server.baseUrl, "leaving@example.com", "leaving-pass-1");
  await victim.post("/api/crops", { name: "Potato", season: "Rabi", water: "Medium" });
  await victim.post("/api/ai/chat", { message: "hello" });

  const exported = await victim.get("/api/profile/export");
  assert.equal(exported.status, 200);
  assert.match(exported.headers.get("content-disposition"), /attachment/);
  assert.equal(exported.data.profile.email, "leaving@example.com");
  assert.equal(exported.data.crops.length, 1);
  assert.equal(exported.data.chatMessages.length, 2);

  assert.equal((await victim.request("DELETE", "/api/profile", { body: { confirmation: "wrong-password" } })).status, 400);
  const del = await victim.request("DELETE", "/api/profile", { body: { confirmation: "leaving-pass-1" } });
  assert.equal(del.status, 200);
  assert.equal((await victim.get("/api/auth/me")).status, 401);
  assert.equal((await new Client(server.baseUrl).post("/api/auth/login", { email: "leaving@example.com", password: "leaving-pass-1" })).status, 401);
});

test("place search validates input", async () => {
  assert.equal((await user.get("/api/insights/places?q=a")).status, 400);
});

test("farm context descriptions", () => {
  const now = new Date("2026-12-01T00:00:00Z").getTime();
  assert.equal(
    describeCrop({ name: "Wheat", season: "Rabi", water: "Medium", sowingDate: "2026-11-01", areaAcres: 2 }, now),
    "Wheat (Rabi season, Medium water need, sown 2026-11-01, 30 days ago, 2 acres)"
  );
  assert.equal(describeSoil({ nitrogen: 245, nitrogenRating: "Low", ph: 7.2 }), "N 245 kg/ha (Low on the card), pH 7.2");
  assert.equal(describeSoil({}), null);
  assert.equal(
    describeWeather({ temperatureC: 24, humidityPct: 80, soilMoisturePct: 30, rain: [{ date: "2026-12-01", probabilityPct: 60, amountMm: 3 }] }),
    "24°C, humidity 80%, modelled topsoil moisture 30%, rain outlook 2026-12-01: 60% chance, 3 mm"
  );
});

test("registration signs the new user in immediately", async () => {
  const c = new Client(server.baseUrl);
  const r = await c.post("/api/auth/register", { email: "instant@example.com", password: "instant-pass-1", acceptPrivacy: true });
  assert.equal(r.status, 201);
  assert.ok(c.cookie.startsWith("cropmind_session="), "session cookie set on sign-up");
  const me = await c.get("/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.data.user.email, "instant@example.com");
});

test("failed sign-up attempts do not use up the sign-up limit", async () => {
  const c = new Client(server.baseUrl);
  for (let i = 0; i < 12; i++) {
    const bad = await c.post("/api/auth/register", { email: `typo${i}@example.com`, password: "short", acceptPrivacy: true });
    assert.equal(bad.status, 400);
  }
  const ok = await c.post("/api/auth/register", { email: "after-typos@example.com", password: "long-enough-1", acceptPrivacy: true });
  assert.equal(ok.status, 201);
});

test("a new user has no location until one is chosen (no empty {} from the database)", async () => {
  const c = await registerAndLogin(server.baseUrl, "fresh-profile@example.com");
  const profile = await c.get("/api/profile");
  assert.equal(profile.data.location, undefined);
  assert.equal(profile.data.soilTest, undefined);
});
