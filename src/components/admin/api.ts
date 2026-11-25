"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** Calls the panel API; a lapsed session sends the browser back to the login page. */
export async function api<T>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    method: init.method ?? (init.body || init.form ? "POST" : "GET"),
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : {},
    body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : null),
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401 && path !== "login") {
    window.location.assign("/admin");
  }
  if (!res.ok) throw new ApiError(typeof data["error"] === "string" ? data["error"] : "حدث خطأ غير متوقع.", res.status, data);
  return data as T;
}

/** A date and time in Arabic, Gregorian calendar, Istanbul time. */
export const arDate = (iso: string) =>
  new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul", calendar: "gregory", numberingSystem: "latn" }).format(new Date(iso));
