/// <reference types="bun" />
import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GROUPS, REGULAR_GROUPS } from "@/components/shukraan/data";
import { INVITES_DIR, describeInvites, inviteForGroup, parseLink, readInvite } from "./whatsapp-invites";

const PLACEHOLDER_LINK = "https://chat.whatsapp.com/PLACEHOLDER";
const REAL_LINK = "https://chat.whatsapp.com/TestOnlyGroup123";
const placeholderImage = readFileSync(path.join(INVITES_DIR, "normal-a2-kadin-1.png"));
// Any bytes other than the placeholder's stand in for a group's own image.
const ownImage = Buffer.concat([placeholderImage.subarray(0, 8), Buffer.from("a group's own QR image")]);

const tmp: string[] = [];
const folder = (files: Record<string, string | Buffer>) => {
  const dir = mkdtempSync(path.join(tmpdir(), "wa-"));
  tmp.push(dir);
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(dir, name), body);
  return dir;
};
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));
const decoded = (dataUrl: string) => Buffer.from(dataUrl.split(",")[1] ?? "", "base64");

describe("whatsapp-gruplari folder", () => {
  test("holds a link and the placeholder image for each of the 24 groups, plus a README", () => {
    const all = [...REGULAR_GROUPS, ...GROUPS];
    expect(all).toHaveLength(24);
    expect(new Set(all.map((g) => g.file)).size).toBe(24);
    for (const g of all) {
      expect(g.file).toMatch(/^(normal|yogun)-(a2|b1|b2)-(kadin|erkek)-[12]$/);
      expect(readFileSync(path.join(INVITES_DIR, `${g.file}.txt`), "utf8").trim()).toBe(PLACEHOLDER_LINK);
      expect(readFileSync(path.join(INVITES_DIR, `${g.file}.png`)).equals(placeholderImage)).toBe(true);
    }
    expect(existsSync(path.join(INVITES_DIR, "README.txt"))).toBe(true);
  });
  test("every group still has the placeholder, so no group has a link yet", async () => {
    expect(await describeInvites()).toEqual({ groups: 24, found: 24, linked: 0 });
    expect(await inviteForGroup("A2 · Kadın 1")).toBeNull();
    expect(await inviteForGroup("B2 · Erkek 2+")).toBeNull();
  });
  test("the placeholder image is not a QR code look-alike: one neutral PNG", () => {
    expect(placeholderImage.subarray(1, 4).toString()).toBe("PNG");
    expect(createHash("sha256").update(placeholderImage).digest("hex")).toBe("ef2a31e63620b6591d58c453cae9e72faf4ef018b4d3ab39eda04bcb2b914dff");
  });
});

describe("reading a group's link", () => {
  test("the placeholder, or anything that is not a https://chat.whatsapp.com/ link, gives no link", () => {
    for (const text of [PLACEHOLDER_LINK, `${PLACEHOLDER_LINK}/`, "https://chat.whatsapp.com/placeholder", "http://chat.whatsapp.com/AbC123", "https://chat.whatsapp.com.evil.example/AbC", "https://example.com/AbC", "https://chat.whatsapp.com/", "", "not a link"])
      expect(parseLink(text)).toBeNull();
  });
  test("a real link is read from the first line, ignoring a BOM, CRLF and blank lines", () => {
    expect(parseLink(`${REAL_LINK}\n`)).toBe(REAL_LINK);
    expect(parseLink(`﻿\r\n  ${REAL_LINK}  \r\n`)).toBe(REAL_LINK);
  });
});

describe("a group's invite", () => {
  test("a placeholder link gives no invite, whatever the image", async () => {
    const dir = folder({ "g.txt": `${PLACEHOLDER_LINK}\n`, "g.png": ownImage });
    expect(await readInvite(dir, "g")).toBeNull();
    expect(await readInvite(dir, "missing")).toBeNull();
  });
  test("a real link with its own image gives that image", async () => {
    const dir = folder({ "g.txt": REAL_LINK, "g.png": ownImage });
    const invite = await readInvite(dir, "g");
    expect(invite?.url).toBe(REAL_LINK);
    expect(invite?.qr.startsWith("data:image/png;base64,")).toBe(true);
    expect(decoded(invite!.qr).equals(ownImage)).toBe(true);
  });
  test("a real link with only the placeholder image gives a QR code generated from the link", async () => {
    const dir = folder({ "g.txt": REAL_LINK, "g.png": placeholderImage });
    const invite = await readInvite(dir, "g");
    expect(invite?.url).toBe(REAL_LINK);
    expect(invite?.qr.startsWith("data:image/png;base64,")).toBe(true);
    const png = decoded(invite!.qr);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.equals(placeholderImage)).toBe(false);
  });
  test("the placeholder plus another image (.jpg / .jpeg / upper-case) uses the other one", async () => {
    for (const name of ["g.jpg", "g.jpeg", "g.JPG"]) {
      const dir = folder({ "g.txt": REAL_LINK, "g.png": placeholderImage, [name]: ownImage });
      const invite = await readInvite(dir, "g");
      expect(invite?.qr.startsWith("data:image/jpeg;base64,")).toBe(true);
      expect(decoded(invite!.qr).equals(ownImage)).toBe(true);
    }
  });
  test("a real link with no image at all still gets a generated QR code", async () => {
    const invite = await readInvite(folder({ "g.txt": REAL_LINK }), "g");
    expect(invite?.qr.startsWith("data:image/png;base64,")).toBe(true);
  });
  test("a saved group id finds its group's files; a new-group request has none", async () => {
    const dir = folder({ "yogun-b2-erkek-2.txt": REAL_LINK, "normal-a2-kadin-1.txt": PLACEHOLDER_LINK });
    expect((await inviteForGroup("B2 · Erkek 2+", dir))?.url).toBe(REAL_LINK);
    expect(await inviteForGroup("A2 · Kadın 1", dir)).toBeNull();
    expect(await inviteForGroup("Erkek new+", dir)).toBeNull();
  });
});
