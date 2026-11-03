/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { GROUPS, REGULAR_GROUPS, groupsFor, priceFor, qrFor } from "./data";

describe("Course booking rules", () => {
  test("regular course costs 250 TL per lesson and 2.000 TL for eight", () => {
    expect(priceFor("regular")).toMatchObject({ perLesson: 250, lessons: 8, total: "2.000" });
    expect(250 * priceFor("regular").lessons).toBe(2000);
  });
  test("intensive course retains 225 TL per lesson and 3.600 TL for sixteen", () => {
    expect(priceFor("intensive")).toMatchObject({ perLesson: 225, lessons: 16, total: "3.600" });
    expect(225 * priceFor("intensive").lessons).toBe(3600);
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