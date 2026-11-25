/// <reference types="bun" />
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  attemptsLeft,
  checkPassword,
  clearFailures,
  clientIp,
  createSession,
  MAX_ATTEMPTS,
  previewToken,
  recordFailure,
  resetAuthState,
  retryAfter,
  revokeSession,
  sameOrigin,
  sessionCookie,
  verifyPreview,
  verifySession,
  WINDOW_MS,
} from "./auth.server";

const PASSWORD = "correct horse battery staple";

beforeEach(() => {
  process.env["ADMIN_PASSWORD"] = PASSWORD;
  resetAuthState();
});
afterEach(() => {
  delete process.env["ADMIN_PASSWORD"];
});

describe("Login", () => {
  test("accepts only ADMIN_PASSWORD", () => {
    expect(checkPassword(PASSWORD)).toBe(true);
    expect(checkPassword("wrong")).toBe(false);
    expect(checkPassword("")).toBe(false);
    expect(checkPassword(PASSWORD + " ")).toBe(false);
    expect(checkPassword(PASSWORD.slice(0, -1))).toBe(false);
  });
  test("with no ADMIN_PASSWORD set, nothing logs in (not even an empty password)", () => {
    delete process.env["ADMIN_PASSWORD"];
    expect(checkPassword("")).toBe(false);
    expect(checkPassword("anything")).toBe(false);
  });
  test("the session cookie is httpOnly, Secure, SameSite=Strict and lasts 12 hours", () => {
    const s = createSession();
    const c = sessionCookie(s.value, s.maxAge);
    expect(c).toMatchObject({ httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 12 * 3600 });
  });
  test("a session is valid for 12 hours, then expires", () => {
    const now = Date.UTC(2026, 10, 23, 9);
    const s = createSession(now);
    expect(verifySession(s.value, now + 1000)).toBe(true);
    expect(verifySession(s.value, now + 12 * 3_600_000 - 1)).toBe(true);
    expect(verifySession(s.value, now + 12 * 3_600_000 + 1)).toBe(false);
  });
  test("a tampered, foreign or empty cookie is refused", () => {
    const s = createSession();
    const [exp, nonce, mac] = s.value.split(".") as [string, string, string];
    expect(verifySession(`${Number(exp) + 3_600_000}.${nonce}.${mac}`)).toBe(false);
    expect(verifySession(`${exp}.${nonce}.${mac.slice(0, -2)}xx`)).toBe(false);
    expect(verifySession("")).toBe(false);
    expect(verifySession(undefined)).toBe(false);
    expect(verifySession("a.b")).toBe(false);
  });
  test("logging out ends the session on the server", () => {
    const s = createSession();
    expect(verifySession(s.value)).toBe(true);
    revokeSession(s.value);
    expect(verifySession(s.value)).toBe(false);
  });
  test("changing ADMIN_PASSWORD signs every session out", () => {
    const s = createSession();
    process.env["ADMIN_PASSWORD"] = "a new password";
    expect(verifySession(s.value)).toBe(false);
  });
  test("a preview link opens one page's draft for 7 days", () => {
    const now = Date.UTC(2026, 10, 23);
    const t = previewToken("standart", now);
    expect(verifyPreview("standart", t, now + 6 * 86_400_000)).toBe(true);
    expect(verifyPreview("standart", t, now + 7 * 86_400_000 + 1)).toBe(false);
    expect(verifyPreview("another-page", t, now)).toBe(false);
    expect(verifyPreview("standart", null, now)).toBe(false);
  });
  test("a change from another site is refused (Origin check)", () => {
    expect(sameOrigin(new Headers({ origin: "https://shukraan.example", host: "shukraan.example" }))).toBe(true);
    expect(sameOrigin(new Headers({ origin: "https://evil.example", host: "shukraan.example" }))).toBe(false);
    expect(sameOrigin(new Headers({ origin: "https://shukraan.example", host: "internal:3000", "x-forwarded-host": "shukraan.example" }))).toBe(true);
    expect(sameOrigin(new Headers({ "sec-fetch-site": "cross-site", host: "shukraan.example" }))).toBe(false);
  });
});

describe("Rate limiting", () => {
  test("5 failed attempts per 15 minutes per IP, then locked", () => {
    const t0 = Date.UTC(2026, 10, 23, 10);
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(retryAfter("1.2.3.4", t0 + i)).toBe(0);
      recordFailure("1.2.3.4", t0 + i);
    }
    expect(attemptsLeft("1.2.3.4", t0 + 10)).toBe(0);
    const wait = retryAfter("1.2.3.4", t0 + 10);
    expect(wait).toBeGreaterThan(14 * 60);
    expect(wait).toBeLessThanOrEqual(15 * 60);
  });
  test("other IPs are not affected", () => {
    const t0 = Date.now();
    for (let i = 0; i < MAX_ATTEMPTS; i++) recordFailure("1.2.3.4", t0);
    expect(retryAfter("5.6.7.8", t0)).toBe(0);
    expect(attemptsLeft("5.6.7.8", t0)).toBe(MAX_ATTEMPTS);
  });
  test("the lock lifts once the oldest failure is 15 minutes old", () => {
    const t0 = Date.UTC(2026, 10, 23, 10);
    for (let i = 0; i < MAX_ATTEMPTS; i++) recordFailure("9.9.9.9", t0 + i * 60_000);
    expect(retryAfter("9.9.9.9", t0 + 5 * 60_000)).toBeGreaterThan(0);
    expect(retryAfter("9.9.9.9", t0 + WINDOW_MS + 1)).toBe(0);
    expect(attemptsLeft("9.9.9.9", t0 + WINDOW_MS + 1)).toBe(1);
  });
  test("a successful login clears the count", () => {
    recordFailure("2.2.2.2");
    recordFailure("2.2.2.2");
    clearFailures("2.2.2.2");
    expect(attemptsLeft("2.2.2.2")).toBe(MAX_ATTEMPTS);
  });
  test("the IP is the proxy's last X-Forwarded-For entry (a visitor cannot pick it)", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("local");
  });
});
