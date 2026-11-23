/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { LangContent } from "@/lib/cms/types";
import { WHATSAPP_GROUPS, courseTitle, formatTL, groupIdFor, priceFor } from "./data";

// The page's texts live in content/ (one file per language); these checks read them there.
const LANGS = ["tr", "en", "ar"] as const;
const page = (lang: string) => JSON.parse(readFileSync(path.join(process.cwd(), "content/pages/standart", `${lang}.json`), "utf8")) as LangContent;
const section = (lang: string, type: string) => page(lang).sections.find((s) => s.type === type)!.fields as Record<string, unknown>;
const FAQ = (lang: string) => section(lang, "faq")["items"] as { q: string; aHtml: string }[];
const PHRASES = (lang: string) => section(lang, "phrases")["items"] as { ar: string; level: string }[];
const CREDENTIALS = (lang: string) => (section(lang, "instructor")["credentials"] as { text: string }[]).map((c) => c.text);

describe("Course booking rules", () => {
  test("regular course costs 400 TL per lesson and 3.200 TL for eight", () => {
    expect(priceFor("regular")).toMatchObject({ perLesson: 400, lessons: 8, total: 3200 });
    expect(400 * priceFor("regular").lessons).toBe(3200);
  });
  test("intensive course costs 375 TL per lesson and 6.000 TL for sixteen", () => {
    expect(priceFor("intensive")).toMatchObject({ perLesson: 375, lessons: 16, total: 6000 });
    expect(375 * priceFor("intensive").lessons).toBe(6000);
  });
  test("amounts are written in Turkish style", () => {
    expect(formatTL(3200)).toBe("3.200");
    expect(formatTL(400)).toBe("400");
  });
  test("one WhatsApp group per course and group type, saved as gender with + for Yoğun", () => {
    expect(WHATSAPP_GROUPS.map((g) => [g.id, g.file])).toEqual([
      ["Kadın", "normal-kadin"],
      ["Erkek", "normal-erkek"],
      ["Kadın+", "yogun-kadin"],
      ["Erkek+", "yogun-erkek"],
    ]);
    expect(groupIdFor("regular", "Kadın")).toBe("Kadın");
    expect(groupIdFor("intensive", "Erkek")).toBe("Erkek+");
    expect(groupIdFor("intensive", "")).toBe("");
  });
});
describe("Offer eligibility and wording", () => {
  test("no Sakarya offer, 20% discount or limited-time claim in FAQ", () => {
    for (const lang of LANGS) {
      const text = JSON.stringify(FAQ(lang));
      expect(text).not.toMatch(/Sakarya|%20|Sınırlı süreli|sınırlı sürelidir/);
    }
  });
  test("no timetable or waitlist wording in the FAQ or the phrases", () => {
    const text = JSON.stringify([FAQ("tr"), PHRASES("tr")]);
    expect(text).not.toMatch(/saat|bekleme|Kasım/i);
  });
  test("the level notes stay: the FAQ answer and a level on every phrase", () => {
    expect(FAQ("tr")[0]?.q).toBe("Bu kurs sıfırdan başlayanlar için uygun mu?");
    for (const lang of LANGS) expect(new Set(PHRASES(lang).map((p) => p.level))).toEqual(new Set(["A2", "B1", "B2"]));
  });
  test("prices are not limited to Dâd members and the 380 TL reference is gone", () => {
    for (const lang of LANGS) {
      const text = JSON.stringify(FAQ(lang));
      expect(text).not.toMatch(/Dâd|ضاد|380/);
    }
  });
  test("regular course is named Normal Konuşma Kursu", () => {
    expect(courseTitle("regular")).toBe("Normal Konuşma Kursu");
    expect(courseTitle("intensive")).toBe("Yoğun Konuşma Kursu (+)");
    expect(page("tr").ui["course.regular"]).toBe("Normal Konuşma Kursu");
    expect(page("tr").ui["course.intensive"]).toBe("Yoğun Konuşma Kursu (+)");
  });
  test("disputed credential is not shown", () => {
    for (const lang of LANGS) expect(CREDENTIALS(lang).join(" ")).not.toMatch(/mesleki doktora/);
  });
});
