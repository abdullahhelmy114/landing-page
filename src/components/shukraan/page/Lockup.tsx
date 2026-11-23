"use client";

import type { CSSProperties } from "react";

import { taglineFor } from "@/lib/cms/i18n";
import { SCHEMES } from "@/lib/cms/lockup";
import type { Scheme, SiteConfig } from "@/lib/cms/types";

/**
 * The academy's lockup: the emblem on the side; the Arabic name on top, «ShukraanEdu Academy»
 * under it and the tagline under that. The emblem is the logo's shape filled with the scheme's
 * colour, so one logo file serves all four schemes. Under 380 px it stacks vertically (CSS).
 */
export function Lockup({ site, lang, scheme, alt, as: Tag = "div", className = "" }: { site: SiteConfig; lang: string; scheme: Scheme; alt: string; as?: "div" | "span"; className?: string }) {
  const tagline = taglineFor(site.tagline, lang, site.fallbackLanguage);
  const tagLang = site.tagline[lang]?.trim() ? lang : site.fallbackLanguage;
  const tagDir = site.languages.find((l) => l.code === tagLang)?.dir ?? "ltr";
  const { fg } = SCHEMES[scheme];
  return (
    <Tag className={`lockup ${className}`} data-scheme={scheme} style={{ "--lk-fg": fg } as CSSProperties}>
      <span className="lockup-emblem" role="img" aria-label={alt} />
      <span className="lockup-text">
        <span className="lockup-ar" lang="ar" dir="rtl">
          {site.brand.arabic}
        </span>
        <span className="lockup-latin" lang="en" dir="ltr">
          {site.brand.latin}
        </span>
        {tagline && (
          <span className="lockup-tagline" lang={tagLang} dir={tagDir}>
            {tagline}
          </span>
        )}
      </span>
    </Tag>
  );
}
