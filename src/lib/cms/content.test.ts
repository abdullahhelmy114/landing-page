/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { parseOps } from "./api.server";
import { groupDigits, makeT, taglineFor } from "./i18n";
import { AUTO_SCHEME, contrast, resolveScheme, SCHEMES } from "./lockup";
import { applyOp, getAt, OpError, type Drafts } from "./ops";
import { safeHref, safeSrc, sanitizeContent, sanitizeRich, sanitizeSettings } from "./sanitize.server";
import { whatsappHref } from "@/lib/whatsapp-link";
import type { LangContent, PageSettings, Scheme, SiteConfig } from "./types";

const read = <T,>(p: string) => JSON.parse(readFileSync(path.join(process.cwd(), p), "utf8")) as T;
const site = read<SiteConfig>("content/site.json");
const drafts = (): Drafts => ({
  tr: read<LangContent>("content/pages/standart/tr.json"),
  en: read<LangContent>("content/pages/standart/en.json"),
  ar: read<LangContent>("content/pages/standart/ar.json"),
});

describe("Sanitising", () => {
  test("rich text keeps bold, italic, links and lists, and nothing else", () => {
    const out = sanitizeRich('<p onclick="x()">Hi <b>bold</b> <strong>s</strong> <i>it</i> <em>e</em><script>alert(1)</script><img src=x onerror=alert(1)><span style="color:red">t</span></p><ul><li>one</li></ul><ol><li>two</li></ol><iframe src="//evil"></iframe><style>*{}</style>');
    expect(out).toBe("<p>Hi <b>bold</b> <b>s</b> <i>it</i> <i>e</i>t</p><ul><li>one</li></ul><ol><li>two</li></ol>");
  });
  test("links: javascript: and data: are dropped; outside links open safely in a new tab", () => {
    expect(sanitizeRich('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeRich('<a href="data:text/html,hi">x</a>')).toBe("<a>x</a>");
    expect(sanitizeRich('<a href="https://wa.me/1">x</a>')).toBe('<a href="https://wa.me/1" target="_blank" rel="noopener noreferrer">x</a>');
    expect(sanitizeRich('<a href="#sss" target="_top" onmouseover="x">x</a>')).toBe('<a href="#sss">x</a>');
  });
  test("plain links and image sources accept only safe values", () => {
    expect(safeHref("https://instagram.com/x")).toBe("https://instagram.com/x");
    expect(safeHref("mailto:a@b.co")).toBe("mailto:a@b.co");
    expect(safeHref("/en")).toBe("/en");
    expect(safeHref("//evil.example")).toBe("");
    expect(safeHref("javascript:alert(1)")).toBe("");
    expect(safeHref(" JaVaScRiPt:alert(1)")).toBe("");
    expect(safeSrc("/media/abc.webp")).toBe("/media/abc.webp");
    expect(safeSrc("/images/classroom.jpg")).toBe("/images/classroom.jpg");
    expect(safeSrc("/images/../secret")).toBe("");
    expect(safeSrc("http://insecure/x.png")).toBe("");
    expect(safeSrc("javascript:x")).toBe("");
  });
  test("a page's content is cleaned field by field (rich text, links, sources)", () => {
    const c = drafts()["tr"]!;
    const hero = c.sections[0]!.fields as Record<string, unknown>;
    hero["bodyHtml"] = '<b>ok</b><script>bad()</script>';
    hero["title"] = "<b>stays as typed</b>";
    (hero["image"] as { src: string }).src = "javascript:alert(1)";
    c.footer.social[0]!.href = "javascript:alert(1)";
    const out = sanitizeContent(c);
    const h = out.sections[0]!.fields as Record<string, unknown>;
    expect(h["bodyHtml"]).toBe("<b>ok</b>");
    expect(h["title"]).toBe("<b>stays as typed</b>"); // plain text: React escapes it
    expect((h["image"] as { src: string }).src).toBe("");
    expect(out.footer.social[0]!.href).toBe("");
  });
  test("the seed content is already clean (sanitising changes nothing)", () => {
    for (const [lang, c] of Object.entries(drafts())) expect([lang, sanitizeContent(c)]).toEqual([lang, c]);
  });
  test("page settings: plan ids, links, numbers and schemes are checked", () => {
    const s = sanitizeSettings({
      checkout: { mode: "plan", planId: "plan_abc123<script>", url: "javascript:x", promoCode: "bad code<x>" },
      whatsapp: { number: "+90 551 855 01 35", message: { tr: "Merhaba" } },
      lockup: { header: { tone: "cream", scheme: 9 as unknown as Scheme }, footer: { tone: "x" as never, scheme: 4 } },
    } as PageSettings);
    expect(s.checkout).toEqual({ mode: "plan", planId: "", url: "", promoCode: "" });
    expect(s.whatsapp.number).toBe("905518550135");
    expect(s.lockup).toEqual({ header: { tone: "cream", scheme: "auto" }, footer: { tone: "navy", scheme: 4 } });
    expect(sanitizeSettings({ ...s, checkout: { mode: "link", planId: "", url: "https://whop.com/checkout/plan_x", promoCode: "" } }).checkout.url).toBe("https://whop.com/checkout/plan_x");
    expect(sanitizeSettings({ ...s, checkout: { mode: "standard", planId: "", url: "", promoCode: " konusma40 " } }).checkout.promoCode).toBe("KONUSMA40");
  });
  test("the panel API refuses malformed operations and prototype keys", () => {
    expect(parseOps({ ops: [{ op: "setText", lang: "tr", path: ["__proto__", "x"], value: "y" }] })).toBeNull();
    expect(parseOps({ ops: [{ op: "setText", lang: "tr", path: ["sections", "#constructor"], value: "y" }] })).toBeNull();
    expect(parseOps({ ops: [{ op: "addSection", type: "script" }] })).toBeNull();
    expect(parseOps({ ops: [{ op: "restoreSection", entry: {} }] })).toBeNull();
    expect(parseOps({ ops: [] })).toBeNull();
    expect(parseOps({ ops: [{ op: "setText", lang: "tr", path: ["seo", "title"], value: "x" }] })).toEqual([{ op: "setText", lang: "tr", path: ["seo", "title"], value: "x" }]);
  });
});

describe("Draft operations", () => {
  test("text and alt text change in one language only", () => {
    const d = drafts();
    applyOp(d, { op: "setText", lang: "en", path: ["sections", "#top", "fields", "title"], value: "Hello" });
    expect(getAt(d["en"], ["sections", "#top", "fields", "title"])).toBe("Hello");
    expect(getAt(d["tr"], ["sections", "#top", "fields", "title"])).toBe("Arapça biliyorsun.");
    applyOp(d, { op: "setAlt", lang: "ar", path: ["sections", "#egitmen", "fields", "image"], value: "صورة" });
    expect(getAt(d["ar"], ["sections", "#egitmen", "fields", "image", "alt"])).toBe("صورة");
    expect(getAt(d["tr"], ["sections", "#egitmen", "fields", "image", "alt"])).toBe("Dr. Jehan Ziyad");
  });
  test("a new image applies to every language", () => {
    const d = drafts();
    applyOp(d, { op: "setImage", path: ["sections", "#top", "fields", "image"], src: "/media/0123456789abcdef01234567.webp" });
    for (const l of ["tr", "en", "ar"]) expect(getAt(d[l], ["sections", "#top", "fields", "image", "src"])).toBe("/media/0123456789abcdef01234567.webp");
  });
  test("sections are added, duplicated, hidden and moved in every language at once", () => {
    const d = drafts();
    applyOp(d, { op: "addSection", type: "testimonials", after: "top" });
    const ids = (l: string) => d[l]!.sections.map((s) => s.id);
    expect(ids("en")).toEqual(ids("tr"));
    expect(ids("ar")).toEqual(ids("tr"));
    expect(d["tr"]!.sections[1]!.type).toBe("testimonials");
    expect((d["tr"]!.sections[1]!.fields["items"] as { consent: boolean }[])[0]!.consent).toBe(false);
    applyOp(d, { op: "duplicateSection", id: "sss" });
    const i = ids("tr").indexOf("sss");
    const copy = d["tr"]!.sections[i + 1]!;
    expect(copy.type).toBe("faq");
    expect(copy.id).not.toBe("sss");
    // The copy's items get new ids (shared by all languages).
    const itemIds = (l: string) => (d[l]!.sections[i + 1]!.fields["items"] as { id: string }[]).map((x) => x.id);
    expect(itemIds("tr")).not.toContain("q1");
    expect(itemIds("ar")).toEqual(itemIds("tr"));
    applyOp(d, { op: "setHidden", id: "ornekler", hidden: true });
    for (const l of ["tr", "en", "ar"]) expect(d[l]!.sections.find((s) => s.id === "ornekler")!.hidden).toBe(true);
    applyOp(d, { op: "moveSection", id: "kapanis", to: 0 });
    for (const l of ["tr", "en", "ar"]) expect(d[l]!.sections[0]!.id).toBe("kapanis");
  });
  test("list items are added, moved and deleted in every language", () => {
    const d = drafts();
    const list = ["sections", "#sss", "fields", "items"];
    applyOp(d, { op: "listAdd", path: list, after: "q1" });
    const ids = (l: string) => (getAt(d[l], list) as { id: string }[]).map((x) => x.id);
    expect(ids("tr")).toHaveLength(6);
    expect(ids("ar")).toEqual(ids("tr"));
    applyOp(d, { op: "listMove", path: list, id: "q5", to: 0 });
    expect(ids("en")[0]).toBe("q5");
    applyOp(d, { op: "listDelete", path: list, id: "q5" });
    for (const l of ["tr", "en", "ar"]) expect(ids(l)).not.toContain("q5");
  });
  test("a deleted section returns where it was, in every language", () => {
    const d = drafts();
    const before = d["ar"]!.sections.map((s) => s.id);
    const { trash } = applyOp(d, { op: "deleteSection", id: "saatler" }, new Date("2026-11-23T10:00:00Z"));
    expect(trash).toMatchObject({ id: "saatler", type: "timetable", deletedAt: "2026-11-23T10:00:00.000Z" });
    expect(Object.keys(trash!.sections).sort()).toEqual(["ar", "en", "tr"]);
    expect(d["ar"]!.sections.map((s) => s.id)).not.toContain("saatler");
    applyOp(d, { op: "restoreSection", entry: trash! });
    expect(d["ar"]!.sections.map((s) => s.id)).toEqual(before);
    expect(() => applyOp(d, { op: "restoreSection", entry: trash! })).toThrow(OpError);
  });
  test("a path that does not exist is refused", () => {
    expect(() => applyOp(drafts(), { op: "setText", lang: "tr", path: ["sections", "#nope", "fields", "title"], value: "x" })).toThrow(OpError);
    expect(() => applyOp(drafts(), { op: "setText", lang: "tr", path: ["sections", "#top", "fields"], value: "x" })).toThrow(OpError);
  });
});

describe("Languages, tagline and lockup", () => {
  test("the academy name and the three taglines are exactly as given (24 November)", () => {
    expect(site.brand).toEqual({ arabic: "أَكَادِيمِيَّةُ شُكْرَان إِيدْيُو", latin: "ShukraanEdu Academy" });
    expect(site.tagline["ar"]).toBe("تعليم اللّغةِ العربيّةِ الفصحى والتّحليلِ اللّغويِّ للقرآنِ الكريمِ للناطقين بالعربية وبغيرها");
    expect(site.tagline["en"]).toBe("Teaching Classical Arabic (Fuṣḥā) and the linguistic analysis of the Holy Quran, for native and non-native speakers of Arabic");
    expect(site.tagline["tr"]).toBe("Fasih Arapça öğretimi ve Kur'an-ı Kerim'in dilbilimsel analizi; Arapçayı ana dili olarak konuşanlar ve konuşmayanlar için");
  });
  test("the tagline does not repeat the academy's name (it is already in the lockup above it)", () => {
    for (const t of Object.values(site.tagline)) expect(t).not.toMatch(/Shukraan|شُكْرَان|شكران/i);
  });
  test("a language without its own tagline shows the English one", () => {
    expect(taglineFor(site.tagline, "fr", site.fallbackLanguage)).toBe(site.tagline["en"]!);
    expect(taglineFor({ ...site.tagline, de: "  " }, "de", "en")).toBe(site.tagline["en"]!);
    expect(taglineFor(site.tagline, "tr", "en")).toBe(site.tagline["tr"]!);
  });
  test("interface strings fall back to English, fill {n} and pick the Arabic plural", () => {
    const d = drafts();
    const ar = makeT(d["ar"]!.ui, d["en"]!.ui);
    expect(ar("lessons", { n: 8 })).toBe("8 دروس");
    expect(ar("lessons", { n: 16 })).toBe("16 درسًا");
    const fr = makeT({}, d["en"]!.ui);
    expect(fr("lessons", { n: 8 })).toBe("8 lessons");
    expect(fr("missing.key")).toBe("missing.key");
    expect(groupDigits(3200, ".")).toBe("3.200");
    expect(groupDigits(6000, ",")).toBe("6,000");
  });
  test("every language has every interface string the page uses", () => {
    const d = drafts();
    const keys = Object.keys(d["en"]!.ui).sort();
    for (const l of ["tr", "ar"]) expect(Object.keys(d[l]!.ui).sort()).toEqual(keys);
  });
  test("four schemes, each passing WCAG AA (4.5:1) for the tagline", () => {
    expect(Object.keys(SCHEMES)).toEqual(["1", "2", "3", "4"]);
    for (const n of [1, 2, 3, 4] as Scheme[]) expect(contrast(SCHEMES[n].fg, SCHEMES[n].bg)).toBeGreaterThanOrEqual(4.5);
  });
  test("the scheme follows the background unless a page or section forces one", () => {
    // On navy: calm cream (the owner's choice of 24 November: no gold on navy).
    expect(AUTO_SCHEME).toEqual({ navy: 1, cream: 3, gold: 4 });
    expect(resolveScheme({ tone: "navy", scheme: "auto" })).toBe(1);
    expect(SCHEMES[1].fg).toBe("#f3ead7");
    expect(resolveScheme({ tone: "cream", scheme: "auto" })).toBe(3);
    expect(resolveScheme({ tone: "gold", scheme: "auto" })).toBe(4);
    expect(resolveScheme({ tone: "navy", scheme: 1 })).toBe(1);
  });
});

describe("WhatsApp button", () => {
  test("the standard page's button keeps follow-up 9's exact link in Turkish, and has en/ar messages", () => {
    const settings = read<PageSettings>("content/pages/standart/settings.json");
    expect(whatsappHref(settings.whatsapp.number, settings.whatsapp.message["tr"]!)).toBe("https://wa.me/905518550135?text=" + encodeURIComponent("Merhaba, Arapça konuşma kursu hakkında bir sorum var."));
    expect(settings.whatsapp.message["en"]).toBeTruthy();
    expect(settings.whatsapp.message["ar"]).toBeTruthy();
    expect(whatsappHref("+90 551", "")).toBe("https://wa.me/90551");
  });
});

describe("Wording", () => {
  const all = JSON.stringify(drafts()) + JSON.stringify(site);
  test("no group-size wording and no 'Az kişi' slogan in any language", () => {
    expect(all).not.toMatch(/en fazla 5 kişi|beş kişilik|5 kişilik|Az kişi|five people|5 people|خمسة أشخاص|5 أشخاص/i);
  });
  test("no old spellings of the academy name", () => {
    expect(all).not.toMatch(/Shukraan Akademi\b|Shukraan Academy|Shukraan Akademi[^s]|أكاديمية شكران(?! إيديو)/);
  });
  test("no Whop payment-page sentence and no 'from $99 a month' line", () => {
    expect(all).not.toMatch(/يُدفَعُ عبرَ صفحةِ Whop|من 99\$|\$99/);
  });
  test("the times (24 November): regular women Sat 11:00, regular men Sun 11:00, intensive Sat+Sun 14:00 and 20:00, lesson by lesson", () => {
    const days: Record<string, string[]> = {
      tr: ["Cumartesi", "Pazar", "Cumartesi ve Pazar", "Cumartesi ve Pazar"],
      en: ["Saturday", "Sunday", "Saturday and Sunday", "Saturday and Sunday"],
      ar: ["السبت", "الأحد", "السبت والأحد", "السبت والأحد"],
    };
    for (const [lang, c] of Object.entries(drafts())) {
      const rows = c.sections.find((s) => s.type === "timetable")!.fields["rows"] as { id: string; days: string; time: string }[];
      expect(rows.map((r) => [r.id, r.time])).toEqual([
        ["normal-kadin", "11:00 - 11:50 + 12:00 - 12:50"],
        ["normal-erkek", "11:00 - 11:50 + 12:00 - 12:50"],
        ["yogun-kadin", "14:00 - 14:50 + 15:00 - 15:50"],
        ["yogun-erkek", "20:00 - 20:50 + 21:00 - 21:50"],
      ]);
      expect(rows.map((r) => r.days)).toEqual(days[lang]!);
    }
  });
  test("the timetable's reschedule/refund/vote paragraph is gone", () => {
    for (const [, c] of Object.entries(drafts())) expect(c.sections.find((s) => s.type === "timetable")!.fields["noteHtml"]).toBe("");
    expect(all).not.toContain("إن لم تناسبك المواعيد، فراسلنا بعد الدفع");
  });
  test("the prices name the offer code, which the page applies on opening", () => {
    const settings = read<PageSettings>("content/pages/standart/settings.json");
    expect(settings.checkout.promoCode).toBe("KONUSMA40");
    expect(drafts()["ar"]!.sections.find((s) => s.type === "pricing")!.fields["discountNote"]).toBe('استخدم كود الخصم "KONUSMA40" واحصل على خصم يصل إلى 40% على دورة المحادثة لهذا العرض.');
    // "Up to 40%": the regular course is 37.5% off (3,200 → 2,000 TL), the intensive 40% (6,000 → 3,600 TL).
    for (const [, c] of Object.entries(drafts())) expect(String(c.sections.find((s) => s.type === "pricing")!.fields["discountNote"])).toMatch(/up to 40%|%40'a varan|يصل إلى 40%/);
    for (const [, c] of Object.entries(drafts())) expect(String(c.sections.find((s) => s.type === "pricing")!.fields["discountNote"])).toContain("KONUSMA40");
  });
});
