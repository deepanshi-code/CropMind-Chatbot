const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { startServer, Client, registerAndLogin } = require("./helpers");

let server;
before(async () => { server = await startServer(); });
after(async () => { await server.close(); });

test("register validates input and rejects duplicates (case-insensitive)", async () => {
  const c = new Client(server.baseUrl);
  let r = await c.post("/api/auth/register", { email: "not-an-email", password: "longenough1" });
  assert.equal(r.status, 400);
  r = await c.post("/api/auth/register", { email: "short@example.com", password: "short7!" });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /at least 8/);
  r = await c.post("/api/auth/register", { email: "Dup@Example.com", password: "longenough1" });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.email, "dup@example.com");
  r = await c.post("/api/auth/register", { email: "dup@example.com", password: "longenough1" });
  assert.equal(r.status, 400);
});

test("login sets an httpOnly session cookie and never returns the token in the body", async () => {
  const c = new Client(server.baseUrl);
  await c.post("/api/auth/register", { email: "cookie@example.com", password: "longenough1" });
  const r = await c.post("/api/auth/login", { email: "COOKIE@example.com", password: "longenough1" });
  assert.equal(r.status, 200);
  assert.equal(r.data.token, undefined);
  const sessionCookie = r.setCookies.find((sc) => sc.startsWith("cropmind_session="));
  assert.ok(sessionCookie, "session cookie set");
  assert.match(sessionCookie, /HttpOnly/i);
  assert.match(sessionCookie, /SameSite=Lax/i);

  const me = await c.get("/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.data.user.email, "cookie@example.com");
});

test("wrong password and unknown user give the same 401", async () => {
  const c = new Client(server.baseUrl);
  const a = await c.post("/api/auth/login", { email: "cookie@example.com", password: "wrong-password" });
  const b = await c.post("/api/auth/login", { email: "nobody@example.com", password: "wrong-password" });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.data.message, b.data.message);
});

test("/me without a session is 401", async () => {
  const r = await new Client(server.baseUrl).get("/api/auth/me");
  assert.equal(r.status, 401);
});

test("logout revokes the session, including copies of the old cookie", async () => {
  const c = await registerAndLogin(server.baseUrl, "logout@example.com");
  const stolenCookie = c.cookie;
  const out = await c.post("/api/auth/logout");
  assert.equal(out.status, 200);
  assert.equal(c.cookie, "", "cookie cleared");

  const attacker = new Client(server.baseUrl);
  attacker.cookie = stolenCookie;
  const r = await attacker.get("/api/auth/me");
  assert.equal(r.status, 401);
});

test("tokens signed with the old public fallback secret are rejected", async () => {
  const forged = jwt.sign({ id: "x", email: "x@x.com", v: 0 }, "fallback_dev_secret_key_cropmind");
  const r = await new Client(server.baseUrl).get("/api/crops", { headers: { Authorization: `Bearer ${forged}` } });
  assert.equal(r.status, 401);
});

test("state-changing requests without the CSRF header are refused", async () => {
  const c = await registerAndLogin(server.baseUrl, "csrf@example.com");
  const r = await c.request("POST", "/api/crops", {
    body: { name: "Wheat", season: "Rabi", water: "Medium" },
    csrf: false,
  });
  assert.equal(r.status, 403);
});

test("dev sandbox OAuth (in-memory DB only) sets the cookie and redirects without a token in the URL", async () => {
  const c = new Client(server.baseUrl);
  const r = await c.request("POST", "/api/auth/sandbox/google/callback", {
    raw: "email=sandbox%40example.com",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    csrf: false,
  });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get("location"), "http://localhost:5173/dashboard");
  assert.ok(!r.headers.get("location").includes("token"));
  assert.ok(c.cookie.startsWith("cropmind_session="));

  // The old fixed sandbox password must not work.
  const login = await new Client(server.baseUrl).post("/api/auth/login", { email: "sandbox@example.com", password: "sandbox-oauth-pass" });
  assert.equal(login.status, 401);
});

test("requests from the app's origin are allowed and other origins are refused", async () => {
  const fromApp = await new Client(server.baseUrl).request("POST", "/api/auth/sandbox/google/callback", {
    raw: "email=origin%40example.com",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: "http://localhost:5173" },
    csrf: false,
  });
  assert.equal(fromApp.status, 302);

  const fromElsewhere = await new Client(server.baseUrl).post("/api/auth/login",
    { email: "origin@example.com", password: "whatever-123" },
    { headers: { Origin: "https://evil.example" } });
  assert.equal(fromElsewhere.status, 403);
});

test("referrer policy keeps browsers sending a real Origin on form posts", async () => {
  const r = await new Client(server.baseUrl).get("/health");
  assert.equal(r.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
});

test("security headers are set and unknown routes return JSON 404", async () => {
  const r = await new Client(server.baseUrl).get("/api/does-not-exist");
  assert.equal(r.status, 404);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-powered-by"), null);
});

test("login is rate limited per account", async () => {
  const c = new Client(server.baseUrl);
  let last;
  for (let i = 0; i < 11; i++) {
    last = await c.post("/api/auth/login", { email: "target@example.com", password: `guess-${i}` });
  }
  assert.equal(last.status, 429);
  assert.match(last.data.message, /this account/);
});
