const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { spawnSync } = require("child_process");

const backendDir = path.join(__dirname, "..");

// Runs a snippet in a fresh Node process with production settings, so module-level config is re-read.
const runProd = (code, env = {}) => spawnSync(process.execPath, ["-e", code], {
  cwd: backendDir,
  encoding: "utf8",
  timeout: 40000,
  env: {
    ...process.env,
    NODE_ENV: "production",
    JWT_SECRET: "prod-test-secret",
    MONGO_URI: "mongodb://127.0.0.1:1/unreachable",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GEMINI_API_KEY: "",
    ...env,
  },
});

test("production refuses to start without JWT_SECRET", () => {
  const r = runProd(`require("./config")`, { JWT_SECRET: "" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /JWT_SECRET must be set/);
});

test("production exits instead of falling back to the in-memory database", () => {
  const r = runProd(`require("./db").connectDB()`);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Could not connect to MongoDB in production/);
});

test("production never exposes the sandbox OAuth and sends Google login back with an error", () => {
  const r = runProd(`
    const express = require("express");
    const app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use("/api/auth", require("./routes/auth"));
    const s = app.listen(0, async () => {
      const base = "http://127.0.0.1:" + s.address().port;
      const sandbox = await fetch(base + "/api/auth/sandbox/google/callback", {
        method: "POST", body: "email=victim%40x.com", redirect: "manual",
        headers: { "content-type": "application/x-www-form-urlencoded" },
      });
      const google = await fetch(base + "/api/auth/google", { redirect: "manual" });
      console.log(JSON.stringify({ sandbox: sandbox.status, google: google.status, location: google.headers.get("location") }));
      s.close();
    });
  `);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim().split("\n").pop());
  assert.equal(out.sandbox, 404);
  assert.equal(out.google, 302);
  assert.match(out.location, /error=GoogleNotConfigured/);
});
