import sanitizeHtml from "sanitize-html";

import type { LangContent, PageSettings, Scheme } from "./types";

/**
 * Rich text (fields whose key ends in "Html") keeps only bold, italic, links, lists, paragraphs
 * and line breaks. Every other field is plain text, which React escapes when it renders.
 */
const RICH: sanitizeHtml.IOptions = {
  allowedTags: ["b", "strong", "i", "em", "a", "ul", "ol", "li", "p", "br"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tag, attribs) => {
      const href = safeHref(attribs["href"] ?? "");
      const external = /^https?:/i.test(href);
      return {
        tagName: "a",
        attribs: external ? { href, target: "_blank", rel: "noopener noreferrer" } : href ? { href } : {},
      };
    },
    strong: "b",
    em: "i",
  },
};

export const sanitizeRich = (html: string) => sanitizeHtml(html, RICH).trim();

/** A link the page may use: http(s), mailto:, tel:, a site path or an in-page anchor; otherwise "". */
export function safeHref(v: string): string {
  const s = v.trim();
  if (!s) return "";
  if (/^#[\w-]*$/.test(s)) return s;
  if (/^\/(?!\/)[^\s"'<>\\]*$/.test(s)) return s;
  if (/^(https?:\/\/|mailto:|tel:)[^\s"'<>\\]+$/i.test(s)) return s;
  return "";
}

/** An image the page may show: a site image, an uploaded one, or an https URL; otherwise "". */
export function safeSrc(v: string): string {
  const s = v.trim();
  if (/^\/(images|media)\/[\w./-]+$/.test(s) && !s.includes("..")) return s;
  if (/^https:\/\/[^\s"'<>\\]+$/i.test(s)) return s;
  return "";
}

const strip = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");

function clean(value: unknown, key: string): unknown {
  if (typeof value === "string") {
    if (key.endsWith("Html")) return sanitizeRich(value);
    if (key === "href" || key === "url") return safeHref(value);
    if (key === "src" || key === "image") return safeSrc(value);
    return strip(value).slice(0, 5000);
  }
  if (Array.isArray(value)) return value.map((v) => clean(v, ""));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) if (!k.startsWith("__")) out[k] = clean(v, k);
    return out;
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  return undefined;
}

/** A language's content with every field cleaned (rich text, links and image sources). */
export const sanitizeContent = (c: LangContent): LangContent => clean(c, "") as LangContent;

const SCHEMES: (Scheme | "auto")[] = ["auto", 1, 2, 3, 4];
const tone = (v: unknown) => (v === "cream" || v === "gold" ? v : "navy");
const scheme = (v: unknown) => (SCHEMES.includes(v as Scheme) ? (v as Scheme | "auto") : "auto");

/** Page settings, with anything unexpected dropped. */
export function sanitizeSettings(s: PageSettings): PageSettings {
  const mode = s.checkout?.mode === "plan" || s.checkout?.mode === "link" ? s.checkout.mode : "standard";
  const planId = String(s.checkout?.planId ?? "").trim();
  const url = safeHref(String(s.checkout?.url ?? ""));
  const promo = String(s.checkout?.promoCode ?? "").trim().toUpperCase();
  return {
    checkout: {
      mode,
      planId: /^plan_[A-Za-z0-9]{4,40}$/.test(planId) ? planId : "",
      url: /^https:\/\//.test(url) ? url : "",
      promoCode: /^[A-Z0-9_-]{1,40}$/.test(promo) ? promo : "",
    },
    whatsapp: {
      number: String(s.whatsapp?.number ?? "").replace(/\D/g, "").slice(0, 15),
      message: Object.fromEntries(Object.entries(s.whatsapp?.message ?? {}).map(([k, v]) => [k, strip(String(v)).slice(0, 500)])),
    },
    lockup: {
      header: { tone: tone(s.lockup?.header?.tone), scheme: scheme(s.lockup?.header?.scheme) },
      footer: { tone: tone(s.lockup?.footer?.tone), scheme: scheme(s.lockup?.footer?.scheme) },
    },
  };
}
