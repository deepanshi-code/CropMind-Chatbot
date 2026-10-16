const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { generate, GeminiError } = require("../services/gemini");

const realFetch = globalThis.fetch;
const realKey = process.env.GEMINI_API_KEY;
let calls;

const reply = (status, payload) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
const ok = (text) => reply(200, { candidates: [{ content: { parts: [{ text }] } }] });
const busy = () => reply(503, { error: { status: "UNAVAILABLE" } });

const stubFetch = (...responses) => {
  calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    const next = responses.shift();
    return typeof next === "function" ? next() : next;
  };
};

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  console.warn = () => {};
  console.error = () => {};
});
afterEach(() => {
  globalThis.fetch = realFetch;
  if (realKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = realKey;
});

const opts = { systemInstruction: "sys", userText: "hello", retryDelayMs: 5 };

test("returns the model text and sends the key in a header, not the URL", async () => {
  stubFetch(ok("  hi there  "));
  assert.equal(await generate(opts), "hi there");
  assert.equal(calls.length, 1);
  assert.ok(!String(calls[0].url).includes("test-key"));
  assert.equal(calls[0].opts.headers["x-goog-api-key"], "test-key");
});

test("retries temporary overload (503) and succeeds", async () => {
  stubFetch(busy(), busy(), ok("recovered"));
  assert.equal(await generate(opts), "recovered");
  assert.equal(calls.length, 3);
});

test("gives a clear 503 'busy' error after retries are exhausted", async () => {
  stubFetch(busy(), busy(), busy());
  await assert.rejects(generate(opts), (err) => err instanceof GeminiError && err.status === 503 && /busy/.test(err.message));
  assert.equal(calls.length, 3);
});

test("does not retry permanent errors such as a bad API key", async () => {
  stubFetch(reply(403, { error: { status: "PERMISSION_DENIED" } }), ok("never reached"));
  await assert.rejects(generate(opts), (err) => err.status === 502);
  assert.equal(calls.length, 1);
});

test("sends history before the new turn and attaches the image to it", async () => {
  stubFetch(ok("x"));
  await generate({
    ...opts,
    history: [{ role: "user", text: "q1" }, { role: "assistant", text: "a1" }],
    image: { mimeType: "image/png", data: "AAAA" },
    json: true,
  });
  const sent = JSON.parse(calls[0].opts.body);
  assert.deepEqual(sent.contents.map((c) => c.role), ["user", "model", "user"]);
  assert.deepEqual(sent.contents[2].parts[0], { inlineData: { mimeType: "image/png", data: "AAAA" } });
  assert.equal(sent.generationConfig.responseMimeType, "application/json");
  assert.equal(sent.systemInstruction.parts[0].text, "sys");
});
