import { findReferral } from "@/lib/discount-codes.server";
import { readSite } from "./store.server";

export type Route =
  | { kind: "page"; slug: string; lang: string; referral?: string }
  | { kind: "redirect"; to: string }
  | { kind: "none" };

/** What a page path segment can be: a language, a referral code or a page slug. */
const SEGMENT = /^[A-Za-z0-9-]{1,60}$/;

/**
 * What a public path shows:
 *   /                 the standard page in the default language
 *   /en               the standard page in another language (/tr goes to /)
 *   /dad40, /en/dad40 a referral link: the standard page with that link's code applied
 *   /kurs, /en/kurs   a course page made in the panel
 */
export async function resolveRoute(segs: string[]): Promise<Route> {
  // Anything else (a file name, a dot, an encoded character…) is no page: answered without any read.
  if (segs.length > 2 || !segs.every((s) => SEGMENT.test(s))) return { kind: "none" };
  const site = await readSite();
  const isLang = (s: string) => site.languages.some((l) => l.code === s);
  const def = site.defaultLanguage;
  const [a, b, ...rest] = segs.map((s) => decodeURIComponent(s));
  if (rest.length) return { kind: "none" };
  if (a === undefined) return { kind: "page", slug: site.standardPage, lang: def };
  if (b === undefined) {
    if (isLang(a)) return a === def ? { kind: "redirect", to: "/" } : { kind: "page", slug: site.standardPage, lang: a };
    if (findReferral(a)) return { kind: "page", slug: site.standardPage, lang: def, referral: a.toLowerCase() };
    if (a === site.standardPage) return { kind: "redirect", to: "/" };
    return { kind: "page", slug: a, lang: def };
  }
  if (!isLang(a)) return { kind: "none" };
  if (a === def) return { kind: "redirect", to: `/${b}` };
  if (findReferral(b)) return { kind: "page", slug: site.standardPage, lang: a, referral: b.toLowerCase() };
  if (b === site.standardPage) return { kind: "redirect", to: `/${a}` };
  return { kind: "page", slug: b, lang: a };
}
