import type { CourseType, Gender } from "@/components/shukraan/data";

/**
 * Umami custom events (cookieless). These are the only events the site sends, and none carries a
 * name, phone, email, discount code, payment id or anything else the visitor typed.
 */
type EventData = {
  whatsapp_float_click: undefined;
  whatsapp_footer_click: undefined;
  price_card_click: { course: AnalyticsCourse };
  group_select: { course: AnalyticsCourse; type: "kadin" | "erkek" };
  payment_step_open: { course: AnalyticsCourse };
  discount_code_result: { valid: boolean };
  payment_complete: { course: AnalyticsCourse };
  whatsapp_group_join_click: undefined;
};
export type AnalyticsEvent = keyof EventData;
export type AnalyticsCourse = "normal" | "yogun";

declare global {
  interface Window {
    umami?: { track: (name: string, data?: Record<string, unknown>) => unknown };
  }
}

export const courseKey = (course: CourseType): AnalyticsCourse => (course === "intensive" ? "yogun" : "normal");
export const typeKey = (gender: Gender): "kadin" | "erkek" => (gender === "Kadın" ? "kadin" : "erkek");

/** Sends one Umami event; does nothing (and never throws) when Umami is not loaded. */
export function track<K extends AnalyticsEvent>(name: K, ...[data]: EventData[K] extends undefined ? [] : [EventData[K]]) {
  try {
    const umami = typeof window === "undefined" ? undefined : window.umami;
    if (typeof umami?.track !== "function") return;
    if (data === undefined) umami.track(name);
    else umami.track(name, data as Record<string, unknown>);
  } catch {
    // Analytics never breaks the page.
  }
}

const ONCE_KEY = "shukraan.analytics.sent";

/**
 * Sends an event once per `key` in this browser tab (a session-storage flag), so a re-render or a
 * return from 3-D Secure cannot count the same action twice.
 */
export function trackOnce<K extends AnalyticsEvent>(key: string, name: K, ...rest: EventData[K] extends undefined ? [] : [EventData[K]]) {
  let sent: string[] = [];
  try {
    const v = JSON.parse(sessionStorage.getItem(ONCE_KEY) ?? "[]") as unknown;
    if (Array.isArray(v)) sent = v.filter((x): x is string => typeof x === "string");
  } catch {
    // Storage unavailable: the event is still sent once from this page.
  }
  if (sent.includes(key)) return;
  try {
    sessionStorage.setItem(ONCE_KEY, JSON.stringify([...sent, key].slice(-20)));
  } catch {
    // ignore
  }
  track(name, ...rest);
}
