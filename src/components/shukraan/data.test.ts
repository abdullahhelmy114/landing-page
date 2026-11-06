/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { CREDENTIALS, FAQ, GROUPS, REGULAR_GROUPS, courseTitle, formatTL, groupsFor, priceFor, qrFor } from "./data";

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
  test("regular A groups restore Monday slots and remain full", () => {
    expect(REGULAR_GROUPS.find((g) => g.id === "Kadın A")).toMatchObject({ full: true, slots: [{ day: "Pazartesi", first: "17:00–17:40", second: "17:50–18:30" }] });
    expect(REGULAR_GROUPS.find((g) => g.id === "Erkek A")).toMatchObject({ full: true, slots: [{ day: "Pazartesi", first: "15:00–15:40", second: "15:50–16:30" }] });
  });
  test("regular B through E restore Tuesday through Friday evening slots", () => {
    for (const [i, letter] of ["B", "C", "D", "E"].entries()) {
      const day = ["Salı", "Çarşamba", "Perşembe", "Cuma"][i];
      if (!day) throw new Error("Missing expected weekday");
      expect(REGULAR_GROUPS.find((g) => g.id === `Kadın ${letter}`)?.slots).toEqual([{ day, first: "18:00–18:40", pause: "10 dk ara", second: "18:50–19:30" }]);
      expect(REGULAR_GROUPS.find((g) => g.id === `Erkek ${letter}`)?.slots).toEqual([{ day, first: "20:00–20:40", pause: "10 dk ara", second: "20:50–21:30" }]);
    }
  });
  test("both courses retain ten separate groups and correct QR paths", () => {
    expect(groupsFor("regular")).toHaveLength(10);
    expect(groupsFor("intensive")).toBe(GROUPS);
    expect(GROUPS).toHaveLength(10);
    expect(groupsFor("regular").every((g) => g.slots.length === 1)).toBe(true);
    expect(groupsFor("intensive").every((g) => g.slots.length === 2)).toBe(true);
    expect(qrFor("Kadın E", "Kadın")).toBe(encodeURI("/QR CODE/Kadın E.png"));
    expect(qrFor("Erkek E+", "Erkek")).toBe(encodeURI("/QR CODE/Erkek E.png"));
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
