const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, Client, registerAndLogin } = require("./helpers");

let server, alice, bob;
before(async () => {
  server = await startServer();
  alice = await registerAndLogin(server.baseUrl, "alice@example.com");
  bob = await registerAndLogin(server.baseUrl, "bob@example.com");
});
after(async () => { await server.close(); });

test("crops require a session", async () => {
  const r = await new Client(server.baseUrl).get("/api/crops");
  assert.equal(r.status, 401);
});

test("crop input is validated and trimmed", async () => {
  let r = await alice.post("/api/crops", { name: "Wheat", season: "Monsoon", water: "Medium" });
  assert.equal(r.status, 400);
  r = await alice.post("/api/crops", { name: "x".repeat(61), season: "Rabi", water: "Medium" });
  assert.equal(r.status, 400);
  r = await alice.post("/api/crops", { name: "  Mustard  ", season: "Rabi", water: "Low" });
  assert.equal(r.status, 201);
  assert.equal(r.data.name, "Mustard");
});

test("users only see and change their own crops", async () => {
  const created = await alice.post("/api/crops", { name: "Basmati", season: "Kharif", water: "High" });
  const id = created.data.id;

  const bobList = await bob.get("/api/crops");
  assert.equal(bobList.status, 200);
  assert.ok(bobList.data.every((c) => c.id !== id));
  assert.equal((await bob.get(`/api/crops/${id}`)).status, 404);
  assert.equal((await bob.put(`/api/crops/${id}`, { name: "Hacked" })).status, 404);
  assert.equal((await bob.delete(`/api/crops/${id}`)).status, 404);

  const updated = await alice.put(`/api/crops/${id}`, { water: "Medium" });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.water, "Medium");
  assert.equal(updated.data.name, "Basmati");
  assert.equal((await alice.delete(`/api/crops/${id}`)).status, 204);
  assert.equal((await alice.get(`/api/crops/${id}`)).status, 404);
});

test("search treats regex characters literally and stays within the user's crops", async () => {
  await alice.post("/api/crops", { name: "Maize (hybrid)", season: "Kharif", water: "Medium" });
  let r = await alice.get(`/api/crops/search/${encodeURIComponent("(a+)+$")}`);
  assert.equal(r.status, 200);
  assert.equal(r.data.length, 0);
  r = await alice.get(`/api/crops/search/${encodeURIComponent("(hybrid)")}`);
  assert.equal(r.data.length, 1);
  r = await bob.get("/api/crops/search/maize");
  assert.equal(r.data.length, 0);
});

test("telemetry logs are validated and private", async () => {
  let r = await alice.post("/api/telemetry", { time: "12:00:00", type: "alarm", text: "x" });
  assert.equal(r.status, 400);
  r = await alice.post("/api/telemetry", { time: "12:00:00", type: "warning", text: "Low moisture." });
  assert.equal(r.status, 201);
  assert.equal((await alice.get("/api/telemetry")).data.length, 1);
  assert.equal((await bob.get("/api/telemetry")).data.length, 0);
});

test("malformed and oversized bodies are rejected cleanly", async () => {
  let r = await alice.request("POST", "/api/crops", { raw: "{bad json", headers: { "Content-Type": "application/json" } });
  assert.equal(r.status, 400);
  r = await alice.post("/api/crops", { name: "y".repeat(30000), season: "Rabi", water: "Low" });
  assert.equal(r.status, 413);
});
