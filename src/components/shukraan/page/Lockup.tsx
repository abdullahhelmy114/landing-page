"use client";

import type { CSSProperties } from "react";

import { nameFor, taglineFor } from "@/lib/cms/i18n";
import { SCHEMES } from "@/lib/cms/lockup";
import type { Scheme, SiteConfig } from "@/lib/cms/types";
import { Emblem } from "../Emblem";

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * The academy's lockup: the emblem on the side; the name in the page language's form (for example
 * «أَكاديمِيَّةُ شُكْران إِيدْيُو | ShukraanEdu Academy» on Arabic pages) and the tagline under it.
 * The emblem is drawn in the scheme's colour, so one emblem serves all four schemes. Under 380 px
 * it stacks vertically (CSS).
 */
export function Lockup({ site, lang, scheme, alt, as: Tag = "div", className = "" }: { site: SiteConfig; lang: string; scheme: Scheme; alt: string; as?: "div" | "span"; className?: string }) {
  const tagline = taglineFor(site.tagline, lang, site.fallbackLanguage);
  const tagLang = site.tagline[lang]?.trim() ? lang : site.fallbackLanguage;
  const tagDir = site.languages.find((l) => l.code === tagLang)?.dir ?? "ltr";
  const { fg } = SCHEMES[scheme];
  const name = nameFor(site.brand, lang);
  const parts = name.split(/\s*\|\s*/);
  return (
    <Tag className={`lockup ${className}`} data-scheme={scheme} style={{ "--lk-fg": fg, color: fg } as CSSProperties}>
      <Emblem label={alt} className="lockup-emblem" />
      <span className="lockup-text">
        <span className="lockup-name" data-name={name}>
          {parts.map((part, i) => {
            const ar = ARABIC.test(part);
            return (
              <span key={i} className="lockup-name-part">
                {i > 0 && <span className="lockup-sep" aria-hidden="true"> | </span>}
                <bdi lang={ar ? "ar" : lang === "tr" ? "tr" : "en"} dir={ar ? "rtl" : "ltr"} className={ar ? "lockup-ar" : "lockup-latin"}>
                  {part}
                </bdi>
              </span>
            );
          })}
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
