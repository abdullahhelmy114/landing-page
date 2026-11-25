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
  retryAfter,
  revokeSession,
  sameOrigin,
  sessionCookie,
  verifyPreview,
  verifySession,
  WINDOW_MS,
} from "./auth.server";
import { useRepo } from "./repo/index.server";
import { BACKENDS, type Backend } from "./repo/test-backends";

const PASSWORD = "correct horse battery staple";

// Every test runs on the file store (Docker: memory and DATA_DIR) and on D1 (Cloudflare Workers).
describe.each(BACKENDS.map((b) => [b.name, b] as const))("%s store", (_name: string, backend: Backend) => {
  let current: ReturnType<Backend["make"]>;
  beforeEach(() => {
    process.env["ADMIN_PASSWORD"] = PASSWORD;
    current = backend.make();
    useRepo(current.repo);
  });
  afterEach(() => {
    delete process.env["ADMIN_PASSWORD"];
    delete process.env["STORAGE"];
    useRepo(null);
    current.cleanup();
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
    test("a session is valid for 12 hours, then expires", async () => {
      const now = Date.UTC(2026, 10, 23, 9);
      const s = createSession(now);
      expect(await verifySession(s.value, now + 1000)).toBe(true);
      expect(await verifySession(s.value, now + 12 * 3_600_000 - 1)).toBe(true);
      expect(await verifySession(s.value, now + 12 * 3_600_000 + 1)).toBe(false);
    });
    test("a tampered, foreign or empty cookie is refused", async () => {
      const s = createSession();
      const [exp, nonce, mac] = s.value.split(".") as [string, string, string];
      expect(await verifySession(`${Number(exp) + 3_600_000}.${nonce}.${mac}`)).toBe(false);
      expect(await verifySession(`${exp}.${nonce}.${mac.slice(0, -2)}xx`)).toBe(false);
      expect(await verifySession("")).toBe(false);
      expect(await verifySession(undefined)).toBe(false);
      expect(await verifySession("a.b")).toBe(false);
    });
    test("logging out ends the session on the server", async () => {
      const s = createSession();
      expect(await verifySession(s.value)).toBe(true);
      await revokeSession(s.value);
      expect(await verifySession(s.value)).toBe(false);
      // Another session is not affected.
      expect(await verifySession(createSession().value)).toBe(true);
    });
    test("changing ADMIN_PASSWORD signs every session out", async () => {
      const s = createSession();
      process.env["ADMIN_PASSWORD"] = "a new password";
      expect(await verifySession(s.value)).toBe(false);
    });
    test("a preview link opens one page's draft for 7 days", async () => {
      const now = Date.UTC(2026, 10, 23);
      const t = await previewToken("standart", now);
      expect(await verifyPreview("standart", t, now + 6 * 86_400_000)).toBe(true);
      expect(await verifyPreview("standart", t, now + 7 * 86_400_000 + 1)).toBe(false);
      expect(await verifyPreview("another-page", t, now)).toBe(false);
      expect(await verifyPreview("standart", null, now)).toBe(false);
    });
    test("a preview link must have been handed out by the panel (a correctly signed token that was never stored fails)", async () => {
      const now = Date.now();
      const t = await previewToken("standart", now);
      // The same token against a fresh, empty store.
      current.cleanup();
      current = backend.make();
      useRepo(current.repo);
      process.env["ADMIN_PASSWORD"] = PASSWORD;
      expect(await verifyPreview("standart", t, now)).toBe(false);
    });
    test("a change from another site is refused (Origin check)", () => {
      expect(sameOrigin(new Headers({ origin: "https://shukraan.example", host: "shukraan.example" }))).toBe(true);
      expect(sameOrigin(new Headers({ origin: "https://evil.example", host: "shukraan.example" }))).toBe(false);
      expect(sameOrigin(new Headers({ origin: "https://shukraan.example", host: "internal:3000", "x-forwarded-host": "shukraan.example" }))).toBe(true);
      expect(sameOrigin(new Headers({ "sec-fetch-site": "cross-site", host: "shukraan.example" }))).toBe(false);
    });
  });

  describe("Rate limiting", () => {
    test("5 failed attempts per 15 minutes per IP, then locked", async () => {
      const t0 = Date.UTC(2026, 10, 23, 10);
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        expect(await retryAfter("1.2.3.4", t0 + i)).toBe(0);
        await recordFailure("1.2.3.4", t0 + i);
      }
      expect(await attemptsLeft("1.2.3.4", t0 + 10)).toBe(0);
      const wait = await retryAfter("1.2.3.4", t0 + 10);
      expect(wait).toBeGreaterThan(14 * 60);
      expect(wait).toBeLessThanOrEqual(15 * 60);
    });
    test("other IPs are not affected", async () => {
      const t0 = Date.now();
      for (let i = 0; i < MAX_ATTEMPTS; i++) await recordFailure("1.2.3.4", t0);
      expect(await retryAfter("5.6.7.8", t0)).toBe(0);
      expect(await attemptsLeft("5.6.7.8", t0)).toBe(MAX_ATTEMPTS);
    });
    test("the lock lifts once the oldest failure is 15 minutes old", async () => {
      const t0 = Date.UTC(2026, 10, 23, 10);
      for (let i = 0; i < MAX_ATTEMPTS; i++) await recordFailure("9.9.9.9", t0 + i * 60_000);
      expect(await retryAfter("9.9.9.9", t0 + 5 * 60_000)).toBeGreaterThan(0);
      expect(await retryAfter("9.9.9.9", t0 + WINDOW_MS + 1)).toBe(0);
      expect(await attemptsLeft("9.9.9.9", t0 + WINDOW_MS + 1)).toBe(1);
    });
    test("a successful login clears the count", async () => {
      await recordFailure("2.2.2.2");
      await recordFailure("2.2.2.2");
      await clearFailures("2.2.2.2");
      expect(await attemptsLeft("2.2.2.2")).toBe(MAX_ATTEMPTS);
    });
    test("the IP is the proxy's last X-Forwarded-For entry (a visitor cannot pick it)", () => {
      expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" }))).toBe("203.0.113.7");
      expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
      expect(clientIp(new Headers())).toBe("local");
    });
    test("on Cloudflare the IP is CF-Connecting-IP; elsewhere that header is ignored (it could be forged)", () => {
      const h = new Headers({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "6.6.6.6" });
      expect(clientIp(h)).toBe("6.6.6.6");
      process.env["STORAGE"] = "cloudflare";
      expect(clientIp(h)).toBe("203.0.113.9");
    });
  });
});
