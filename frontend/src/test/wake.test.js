import { describe, expect, it } from "vitest";
import { isWakeRetryable, isBackendUnavailable, retryDelay, MAX_WAKE_RETRIES } from "../services/wake";

const err = (status, { method = "post", headers = {} } = {}) => ({
  config: { method },
  response: status ? { status, headers, data: "Too Many Requests" } : undefined,
});

describe("wake / retry rules", () => {
  it("retries Render's hibernate rate-limit for any method (the request never reached the app)", () => {
    const hibernate = { "x-render-routing": "hibernate-rate-limited" };
    expect(isWakeRetryable(err(429, { method: "post", headers: hibernate }))).toBe(true);
    expect(isWakeRetryable(err(429, { method: "get", headers: hibernate }))).toBe(true);
  });

  it("does not retry the app's own 429 (e.g. too many login attempts)", () => {
    expect(isWakeRetryable(err(429, { method: "post" }))).toBe(false);
    expect(isBackendUnavailable(err(429, { method: "post" }))).toBe(false);
  });

  it("retries gateway and network errors only for read-only requests", () => {
    expect(isWakeRetryable(err(504, { method: "get" }))).toBe(true);
    expect(isWakeRetryable(err(undefined, { method: "get" }))).toBe(true);
    expect(isWakeRetryable(err(504, { method: "post" }))).toBe(false);
    expect(isWakeRetryable(err(500, { method: "get" }))).toBe(false);
  });

  it("never retries the app's own JSON errors, such as 503 \"mandi prices not configured\"", () => {
    const appError = err(503, { method: "get", headers: { "content-type": "application/json; charset=utf-8" } });
    expect(isWakeRetryable(appError)).toBe(false);
    expect(isBackendUnavailable(appError)).toBe(false);
    const gateway = err(503, { method: "get", headers: { "content-type": "text/html" } });
    expect(isWakeRetryable(gateway)).toBe(true);
  });

  it("classifies backend-unavailable errors", () => {
    expect(isBackendUnavailable(err(502))).toBe(true);
    expect(isBackendUnavailable(err(undefined))).toBe(true);
    expect(isBackendUnavailable(err(400))).toBe(false);
  });

  it("waits long enough in total for a cold start", () => {
    const total = Array.from({ length: MAX_WAKE_RETRIES }, (_, i) => retryDelay(i)).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(60000);
  });
});
