import type { CourseType, Gender } from "@/components/shukraan/data";

/**
 * Umami custom events (cookieless). These are the only events the site sends, and none carries a
 * name, phone, email, discount code, payment id or anything else the visitor typed.
 */
type EventData = {
  whatsapp_float_click: undefined;
  whatsapp_footer_click: undefined;
  /** A course page made in the control panel reports its own slug as the course. */
  price_card_click: { course: AnalyticsCourse | string };
  group_select: { course: AnalyticsCourse; type: "kadin" | "erkek" };
  payment_step_open: { course: AnalyticsCourse | string };
  discount_code_result: { valid: boolean };
  payment_complete: { course: AnalyticsCourse | string };
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

/**
 * Where an event happened, beyond the standard page in the default language: the page's slug
 * (`page`) and the language (`lang`), read from <html data-page data-analytics-lang>. Events on a
 * new course page or in another language carry these without any change to the events.
 */
function context(): Record<string, string> {
  const d = typeof document === "undefined" ? undefined : document.documentElement.dataset;
  const out: Record<string, string> = {};
  if (d?.["page"]) out["page"] = d["page"];
  if (d?.["analyticsLang"]) out["lang"] = d["analyticsLang"];
  return out;
}

/** Sends one Umami event; does nothing (and never throws) when Umami is not loaded. */
export function track<K extends AnalyticsEvent>(name: K, ...[data]: EventData[K] extends undefined ? [] : [EventData[K]]) {
  try {
    const umami = typeof window === "undefined" ? undefined : window.umami;
    if (typeof umami?.track !== "function") return;
    const all = { ...(data as Record<string, unknown> | undefined), ...context() };
    if (Object.keys(all).length === 0) umami.track(name);
    else umami.track(name, all);
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
