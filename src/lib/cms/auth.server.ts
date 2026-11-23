import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The control panel's login: one password (ADMIN_PASSWORD), checked in constant time; a signed
 * session cookie (httpOnly, Secure, SameSite=Strict) for 12 hours; at most 5 failed attempts per
 * 15 minutes per IP. Changing ADMIN_PASSWORD signs every session out.
 */

export const SESSION_COOKIE = "shukraan_admin";
export const SESSION_HOURS = 12;
export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60_000;
export const PREVIEW_DAYS = 7;

const password = () => process.env["ADMIN_PASSWORD"] ?? "";
export const loginConfigured = () => password().length > 0;

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest();
const key = (purpose: string) => createHmac("sha256", sha(`shukraan:${purpose}`)).update(password(), "utf8").digest();
const sign = (purpose: string, data: string) => createHmac("sha256", key(purpose)).update(data).digest("base64url");

const sameBytes = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

/** Whether a typed password matches ADMIN_PASSWORD (both hashed first, so lengths never leak). */
export function checkPassword(input: string): boolean {
  const expected = password();
  if (!expected) return false;
  return timingSafeEqual(sha(input), sha(expected));
}

// ── Sessions ─────────────────────────────────────────────────────────────────────────────────
const revoked = new Set<string>();

export function createSession(now = Date.now()): { value: string; maxAge: number } {
  const exp = now + SESSION_HOURS * 3_600_000;
  const nonce = randomBytes(12).toString("base64url");
  const data = `${exp}.${nonce}`;
  return { value: `${data}.${sign("session", data)}`, maxAge: SESSION_HOURS * 3600 };
}

export function verifySession(value: string | undefined, now = Date.now()): boolean {
  if (!value || !loginConfigured()) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [exp, nonce, mac] = parts as [string, string, string];
  if (!/^\d+$/.test(exp) || Number(exp) <= now || revoked.has(nonce)) return false;
  return sameBytes(Buffer.from(mac), Buffer.from(sign("session", `${exp}.${nonce}`)));
}

/** Ends a session on this server, even if a copy of the cookie is kept. */
export function revokeSession(value: string | undefined) {
  const nonce = value?.split(".")[1];
  if (nonce) revoked.add(nonce);
}

export const sessionCookie = (value: string, maxAge: number) => ({
  name: SESSION_COOKIE,
  value,
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});

// ── Rate limit (failed logins per IP) ────────────────────────────────────────────────────────
const failures = new Map<string, number[]>();

const recent = (ip: string, now: number) => (failures.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

/** Seconds until this IP may try again, or 0 when it may try now. */
export function retryAfter(ip: string, now = Date.now()): number {
  const list = recent(ip, now);
  failures.set(ip, list);
  if (list.length < MAX_ATTEMPTS) return 0;
  return Math.max(1, Math.ceil((list[0]! + WINDOW_MS - now) / 1000));
}

/** Failed attempts this IP has left in the current 15-minute window. */
export const attemptsLeft = (ip: string, now = Date.now()) => Math.max(0, MAX_ATTEMPTS - recent(ip, now).length);

export function recordFailure(ip: string, now = Date.now()) {
  failures.set(ip, [...recent(ip, now), now]);
}

export function clearFailures(ip: string) {
  failures.delete(ip);
}

/** Test helper: forgets every recorded failure and revoked session. */
export function resetAuthState() {
  failures.clear();
  revoked.clear();
}

/**
 * The visitor's IP: the last X-Forwarded-For entry (added by Coolify's proxy, so a visitor cannot
 * forge it), then X-Real-IP.
 */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  const last = xff?.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
  return last || headers.get("x-real-ip")?.trim() || "local";
}

/** Whether a request that changes something comes from this site (a second guard next to SameSite). */
export function sameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return headers.get("sec-fetch-site") !== "cross-site";
  try {
    const host = headers.get("x-forwarded-host") ?? headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// ── Preview links ────────────────────────────────────────────────────────────────────────────
/** A link token that shows a page's draft without logging in, for 7 days. */
export function previewToken(slug: string, now = Date.now()): string {
  const exp = now + PREVIEW_DAYS * 86_400_000;
  return `${exp}.${sign("preview", `${slug}.${exp}`)}`;
}

export function verifyPreview(slug: string, token: string | undefined | null, now = Date.now()): boolean {
  if (!token || !loginConfigured()) return false;
  const [exp, mac] = token.split(".");
  if (!exp || !mac || !/^\d+$/.test(exp) || Number(exp) <= now) return false;
  return sameBytes(Buffer.from(mac), Buffer.from(sign("preview", `${slug}.${exp}`)));
}
