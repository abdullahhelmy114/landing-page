import type { SiteConfig } from "./types";

/** Where a page lives in a language: "/" and "/en" for the standard page, "/<slug>" and "/en/<slug>" for others. */
export function pageHref(site: SiteConfig, slug: string, lang: string, referral?: string) {
  const prefix = lang === site.defaultLanguage ? "" : `/${lang}`;
  if (referral) return `${prefix}/${referral}`;
  if (slug === site.standardPage) return prefix || "/";
  return `${prefix}/${slug}`;
}
