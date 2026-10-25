// Waking the free Render backend.
//
// When the backend has been idle it goes to sleep. Requests that reach Render through Vercel's
// shared proxy IPs are then often refused at Render's edge with
//   429 + "X-Render-Routing: hibernate-rate-limited"
// and do NOT wake it. A request straight from the visitor's own browser (their own IP) does,
// so we send one on page load and whenever that refusal is seen, then retry.

export const BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_ORIGIN || "https://cropmind-chatbot-backend.onrender.com";

export const MAX_WAKE_RETRIES = 7;
// About 70 seconds in total: enough for a cold start on the free plan.
const DELAYS_MS = [2000, 4000, 6000, 10000, 12000, 15000, 20000];

export const retryDelay = (attempt) => DELAYS_MS[Math.min(attempt, DELAYS_MS.length - 1)];

const SAFE_METHODS = ["get", "head", "options"];

// Errors produced by CropMind itself are JSON with a "message" (e.g. 503 "mandi prices not
// configured"). Gateway/proxy errors from Vercel or Render are plain text or HTML.
const fromApp = (error) => String(error?.response?.headers?.["content-type"] || "").toLowerCase().includes("application/json");

/**
 * Should this failed request be retried after waking the backend?
 * - 429 marked "hibernate" by Render: refused before reaching the app, so safe for any method.
 * - 502/503/504 or no response at all: the app may or may not have run the request, so only
 *   read-only (GET) requests are retried automatically. Writes are handled by the caller.
 */
export function isWakeRetryable(error) {
  const status = error?.response?.status;
  const routing = String(error?.response?.headers?.["x-render-routing"] || "");
  const method = String(error?.config?.method || "get").toLowerCase();
  if (status === 429 && routing.includes("hibernate")) return true;
  const gatewayOrNetwork = !error?.response || ([502, 503, 504].includes(status) && !fromApp(error));
  return gatewayOrNetwork && SAFE_METHODS.includes(method);
}

/** True for failures caused by the backend being asleep or unreachable (not by the request itself). */
export function isBackendUnavailable(error) {
  const status = error?.response?.status;
  const routing = String(error?.response?.headers?.["x-render-routing"] || "");
  return !error?.response
    || ([502, 503, 504].includes(status) && !fromApp(error))
    || (status === 429 && routing.includes("hibernate"));
}

let lastWake = 0;
/** Fire-and-forget request straight to Render from the visitor's own IP. */
export function wakeBackend() {
  const now = Date.now();
  if (now - lastWake < 5000) return; // at most one wake request every 5 seconds
  lastWake = now;
  try {
    // no-cors: we only need the request to arrive, not to read the answer.
    fetch(`${BACKEND_ORIGIN}/health`, { mode: "no-cors", cache: "no-store", credentials: "omit" }).catch(() => {});
  } catch {
    // fetch unavailable (very old browser): retries still happen
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
