// Test environment: in-memory DB, no external keys. Must run before config/app are required.
Object.assign(process.env, {
  NODE_ENV: "test",
  MONGO_URI: "mongodb://127.0.0.1:1/unreachable",
  JWT_SECRET: "test-secret-not-for-production",
  GEMINI_API_KEY: "",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  DATA_GOV_API_KEY: "",
  FRONTEND_URL: "http://localhost:5173",
});

const realFetch = globalThis.fetch;

async function startServer() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  // Keep test output readable: the app logs every request and the mock-DB warning.
  console.log = () => {};
  console.warn = () => {};
  const db = require("../db");
  const app = require("../app");
  await db.connectDB();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    baseUrl,
    close: () => new Promise((resolve) => {
      console.log = originalLog;
      console.warn = originalWarn;
      server.close(resolve);
    }),
  };
}

/** Minimal browser-like client: keeps the session cookie and sends the CSRF header by default. */
class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookie = "";
  }

  async request(method, path, { body, raw, headers = {}, csrf = true, redirect = "manual" } = {}) {
    const allHeaders = { ...headers };
    if (this.cookie) allHeaders.Cookie = this.cookie;
    if (csrf) allHeaders["X-Requested-With"] = "CropMind";
    let payload;
    if (raw !== undefined) payload = raw;
    else if (body !== undefined) {
      allHeaders["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await realFetch(this.baseUrl + path, { method, headers: allHeaders, body: payload, redirect });
    const setCookies = res.headers.getSetCookie();
    for (const sc of setCookies) {
      const pair = sc.split(";")[0];
      // An expired/cleared cookie has an empty value.
      this.cookie = pair.endsWith("=") ? "" : pair;
    }
    let data = null;
    const text = await res.text();
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data, headers: res.headers, setCookies };
  }

  get(path, opts) { return this.request("GET", path, opts); }
  post(path, body, opts = {}) { return this.request("POST", path, { ...opts, body }); }
  put(path, body, opts = {}) { return this.request("PUT", path, { ...opts, body }); }
  delete(path, opts) { return this.request("DELETE", path, opts); }
}

async function registerAndLogin(baseUrl, email, password = "correct-horse-1") {
  const client = new Client(baseUrl);
  const reg = await client.post("/api/auth/register", { email, password, acceptPrivacy: true });
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.data)}`);
  const login = await client.post("/api/auth/login", { email, password });
  if (login.status !== 200) throw new Error(`login failed: ${login.status} ${JSON.stringify(login.data)}`);
  return client;
}

module.exports = { startServer, Client, registerAndLogin, realFetch };
