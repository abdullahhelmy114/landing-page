/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { CREDENTIALS, FAQ, GROUPS, LEVELS, REGULAR_GROUPS, courseTitle, formatTL, groupsFor, priceFor } from "./data";

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
  test("each course has two Kadın and two Erkek groups per level, all open", () => {
    for (const course of ["regular", "intensive"] as const) {
      expect(groupsFor(course)).toHaveLength(12);
      for (const level of LEVELS)
        for (const gender of ["Kadın", "Erkek"] as const) {
          const names = groupsFor(course).filter((g) => g.level === level && g.gender === gender).map((g) => g.name);
          expect(names).toEqual([`${level} · ${gender} 1`, `${level} · ${gender} 2`]);
        }
      expect(groupsFor(course).every((g) => !g.full)).toBe(true);
    }
    expect(GROUPS.every((g) => g.id === `${g.name}+`)).toBe(true);
    expect(REGULAR_GROUPS.every((g) => g.id === g.name)).toBe(true);
  });
  test("one level per day, nothing on Cuma, 50-minute lessons with a 10-minute break", () => {
    const levelOfDay = new Map<string, string>();
    for (const g of [...GROUPS, ...REGULAR_GROUPS])
      for (const s of g.slots) {
        expect(s.day).not.toBe("Cuma");
        expect(levelOfDay.get(s.day) ?? g.level).toBe(g.level);
        levelOfDay.set(s.day, g.level);
        const [a, b] = s.first.split("–").map((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)));
        const [c] = s.second.split("–").map((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)));
        expect([b! - a!, c! - b!]).toEqual([50, 10]);
      }
    expect(levelOfDay.size).toBe(6);
  });
  test("Yoğun groups meet twice at the same hour; Normal groups once in the evening", () => {
    expect(GROUPS.every((g) => g.slots.length === 2 && g.slots[0]!.first === g.slots[1]!.first)).toBe(true);
    expect(REGULAR_GROUPS.every((g) => g.slots.length === 1 && ["18:00", "20:00"].includes(g.slots[0]!.first.slice(0, 5)))).toBe(true);
    expect(GROUPS.find((g) => g.name === "A2 · Kadın 1")?.slots[0]?.first).toBe("10:00–10:50");
    expect(GROUPS.find((g) => g.name === "A2 · Kadın 1")?.slots[0]?.second).toBe("11:00–11:50");
  });
});
describe("Offer eligibility and wording", () => {
  test("no Sakarya offer, 20% discount or limited-time claim in FAQ", () => {
    const text = JSON.stringify(FAQ);
    expect(text).not.toMatch(/Sakarya|%20|Sınırlı süreli|sınırlı sürelidir/);
  });
  test("prices are not limited to Dâd members and the 380 TL reference is gone", () => {
    const text = JSON.stringify(FAQ);
    expect(text).not.toMatch(/Dâd|ضاد|380/);
  });
  test("regular course is named Normal Konuşma Kursu", () => {
    expect(courseTitle("regular")).toBe("Normal Konuşma Kursu");
    expect(courseTitle("intensive")).toBe("Yoğun Konuşma Kursu (+)");
  });
  test("disputed credential is not shown", () => {
    expect(CREDENTIALS.join(" ")).not.toMatch(/mesleki doktora/);
  });
});
