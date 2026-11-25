import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { repo, usesCloudflare } from "./repo/index.server";

/**
 * The control panel's login: one password (ADMIN_PASSWORD), checked in constant time; a signed
 * session cookie (httpOnly, Secure, SameSite=Strict) for 12 hours; at most 5 failed attempts per
 * 15 minutes per IP. Changing ADMIN_PASSWORD signs every session out.
 *
 * Failed attempts, signed-out sessions and preview links are kept in the store (D1 on Cloudflare,
 * where each request may meet a different Worker instance; memory and DATA_DIR on Docker).
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
export function createSession(now = Date.now()): { value: string; maxAge: number } {
  const exp = now + SESSION_HOURS * 3_600_000;
  const nonce = randomBytes(12).toString("base64url");
  const data = `${exp}.${nonce}`;
  return { value: `${data}.${sign("session", data)}`, maxAge: SESSION_HOURS * 3600 };
}

/** The session's parts when its signature is right and it has not expired (not yet checked against sign-outs). */
function parseSession(value: string | undefined, now: number) {
  if (!value || !loginConfigured()) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [exp, nonce, mac] = parts as [string, string, string];
  if (!/^\d+$/.test(exp) || Number(exp) <= now) return null;
  if (!sameBytes(Buffer.from(mac), Buffer.from(sign("session", `${exp}.${nonce}`)))) return null;
  return { exp: Number(exp), nonce };
}

export async function verifySession(value: string | undefined, now = Date.now()): Promise<boolean> {
  const s = parseSession(value, now);
  if (!s) return false;
  return !(await (await repo()).isSessionRevoked(s.nonce));
}

/** Ends a session on the server, even if a copy of the cookie is kept. */
export async function revokeSession(value: string | undefined, now = Date.now()) {
  const s = parseSession(value, now);
  if (s) await (await repo()).revokeSession(s.nonce, s.exp);
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
const recent = async (ip: string, now: number) => (await (await repo()).loginFailures(ip, now - WINDOW_MS + 1)).filter((t) => now - t < WINDOW_MS);

/** Seconds until this IP may try again, or 0 when it may try now. */
export async function retryAfter(ip: string, now = Date.now()): Promise<number> {
  const list = await recent(ip, now);
  if (list.length < MAX_ATTEMPTS) return 0;
  return Math.max(1, Math.ceil((Math.min(...list) + WINDOW_MS - now) / 1000));
}

/** Failed attempts this IP has left in the current 15-minute window. */
export const attemptsLeft = async (ip: string, now = Date.now()) => Math.max(0, MAX_ATTEMPTS - (await recent(ip, now)).length);

export async function recordFailure(ip: string, now = Date.now()) {
  await (await repo()).addLoginFailure(ip, now);
}

export async function clearFailures(ip: string) {
  await (await repo()).clearLoginFailures(ip);
}

/**
 * The visitor's IP. On Cloudflare: CF-Connecting-IP, which Cloudflare sets and a visitor cannot
 * forge. Elsewhere: the last X-Forwarded-For entry (added by Coolify's proxy), then X-Real-IP.
 */
export function clientIp(headers: Headers): string {
  if (usesCloudflare()) {
    const cf = headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
  }
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
const tokenHash = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

/** A link token that shows a page's draft without logging in, for 7 days; recorded in the store. */
export async function previewToken(slug: string, now = Date.now()): Promise<string> {
  const exp = now + PREVIEW_DAYS * 86_400_000;
  const nonce = randomBytes(9).toString("base64url");
  const token = `${exp}.${nonce}.${sign("preview", `${slug}.${exp}.${nonce}`)}`;
  await (await repo()).putPreviewLink({ hash: tokenHash(token), slug, expiresAt: exp, createdAt: now });
  return token;
}

export async function verifyPreview(slug: string, token: string | undefined | null, now = Date.now()): Promise<boolean> {
  if (!token || !loginConfigured()) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [exp, nonce, mac] = parts as [string, string, string];
  if (!/^\d+$/.test(exp) || Number(exp) <= now) return false;
  if (!sameBytes(Buffer.from(mac), Buffer.from(sign("preview", `${slug}.${exp}.${nonce}`)))) return false;
  const link = await (await repo()).getPreviewLink(tokenHash(token));
  return !!link && link.slug === slug && link.expiresAt > now;
}
