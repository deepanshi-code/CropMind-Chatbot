const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

class GeminiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Statuses Google uses for temporary overload or rate limiting; worth retrying.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls Gemini with a fixed system instruction and untrusted user text kept in a separate turn,
 * so user input cannot overwrite the instructions by being spliced into them.
 * The API key travels in a header, not the URL, so it stays out of proxy and access logs.
 * Temporary overload errors (e.g. 503 "high demand") are retried with backoff within timeoutMs.
 *
 * @param {object}   opts
 * @param {string}   opts.systemInstruction  fixed instructions
 * @param {string}   opts.userText           the new user turn (untrusted)
 * @param {Array<{role: "user"|"assistant", text: string}>} [opts.history]  earlier turns, oldest first
 * @param {{mimeType: string, data: string}} [opts.image]  base64 image attached to the new turn
 * @param {boolean}  [opts.json]             ask for a JSON response
 * @param {number}   [opts.timeoutMs]        total time budget across all attempts
 * @param {number}   [opts.retryDelayMs]     base backoff (doubles each retry)
 */
async function generate({ systemInstruction, userText, history = [], image, json = false, timeoutMs = 30000, retryDelayMs = 1000 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [
      ...history.map((turn) => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.text }] })),
      {
        role: "user",
        parts: [
          ...(image ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }] : []),
          { text: userText },
        ],
      },
    ],
    generationConfig: json ? { responseMimeType: "application/json" } : undefined,
  });

  const deadline = Date.now() + timeoutMs;
  let lastStatus = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), remaining);
    try {
      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body,
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new GeminiError(502, "Empty response received from the AI model.");
        return text.trim();
      }

      lastStatus = response.status;
      const detail = await response.text();
      if (!RETRYABLE_STATUSES.has(response.status)) {
        console.error(`Gemini request failed: ${response.status} ${response.statusText}`, detail);
        throw new GeminiError(502, "Failed to communicate with the AI service. Please try again later.");
      }
      console.warn(`Gemini busy (${response.status}), attempt ${attempt}/${MAX_ATTEMPTS}`);
    } catch (error) {
      if (error instanceof GeminiError) throw error;
      if (error.name === "AbortError") {
        throw new GeminiError(504, "AI response timed out. Please try again.");
      }
      console.error("Gemini call error:", error);
      throw new GeminiError(500, "Internal server error communicating with the AI service.");
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt < MAX_ATTEMPTS) {
      // Exponential backoff with jitter, never past the deadline.
      const wait = retryDelayMs * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5);
      if (Date.now() + wait >= deadline) break;
      await sleep(wait);
    }
  }

  console.error(`Gemini still unavailable after retries (last status ${lastStatus}).`);
  throw new GeminiError(503, "The AI service is busy right now. Please try again in a minute.");
}

module.exports = { generate, GeminiError };
