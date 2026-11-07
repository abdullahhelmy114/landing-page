/// <reference types="bun" />
import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from "@zxing/library";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { WHATSAPP_GROUPS } from "@/components/shukraan/data";
import { INVITES_DIR, describeInvites, inviteForGroup, parseLink, readInvite, resizeRGBA } from "./whatsapp-invites";

const PLACEHOLDER_LINK = "https://chat.whatsapp.com/PLACEHOLDER";
const REAL_LINK = "https://chat.whatsapp.com/TestOnlyGroup123";

/** Which community each group's file must hold (this repository is private). */
const EXPECTED_LINKS: Record<string, string> = {
  "normal-kadin": "https://chat.whatsapp.com/Fi0v7eKZXneGF5A7r4vGAc",
  "normal-erkek": "https://chat.whatsapp.com/HeDnmRWlDAkBP78mUMsr4u",
  "yogun-kadin": "https://chat.whatsapp.com/LBCjAj9hr8W7iL24TDOYSb",
  "yogun-erkek": "https://chat.whatsapp.com/FKo7TdHgzJQLxGbl17Eiot",
};

const tmp: string[] = [];
const folder = (files: Record<string, string | Buffer>) => {
  const dir = mkdtempSync(path.join(tmpdir(), "wa-"));
  tmp.push(dir);
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), body);
  }
  return dir;
};
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));

const pngOf = (dataUrl: string) => PNG.sync.read(Buffer.from(dataUrl.split(",")[1] ?? "", "base64"));

/** Decodes an RGBA image with jsQR and with ZXing; returns both texts (or null). */
function decodeBoth(rgba: Uint8ClampedArray, w: number, h: number) {
  const js = jsQR(rgba, w, h, { inversionAttempts: "dontInvert" })?.data ?? null;
  const lum = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (rgba[i * 4]! * 299 + rgba[i * 4 + 1]! * 587 + rgba[i * 4 + 2]! * 114) / 1000;
  let zx: string | null = null;
  try {
    const hints = new Map<DecodeHintType, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
      [DecodeHintType.TRY_HARDER, true],
    ]);
    zx = new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, w, h))), hints).getText();
  } catch {
    zx = null;
  }
  return { js, zx };
}

describe("whatsapp-gruplari folder", () => {
  test("holds each group's link file, a README and the four logos, and no other images", () => {
    expect(readdirSync(INVITES_DIR).sort()).toEqual([...WHATSAPP_GROUPS.map((g) => `${g.file}.txt`), "README.txt", "logolar"].sort());
    expect(readdirSync(path.join(INVITES_DIR, "logolar")).sort()).toEqual(WHATSAPP_GROUPS.map((g) => `${g.file}.png`).sort());
  });
  test("each file holds its course and gender's link, alone on one line", () => {
    for (const g of WHATSAPP_GROUPS) {
      const text = readFileSync(path.join(INVITES_DIR, `${g.file}.txt`), "utf8");
      expect(text.trim().split(/\r?\n/)).toEqual([EXPECTED_LINKS[g.file]!]);
      expect(parseLink(text)).toBe(EXPECTED_LINKS[g.file]!);
    }
  });
  test("the four logos are round 512 px PNGs, transparent outside the circle", () => {
    for (const g of WHATSAPP_GROUPS) {
      const logo = PNG.sync.read(readFileSync(path.join(INVITES_DIR, "logolar", `${g.file}.png`)));
      expect([logo.width, logo.height]).toEqual([512, 512]);
      for (const [x, y] of [[0, 0], [511, 0], [0, 511], [511, 511]] as const) expect(logo.data[(y * 512 + x) * 4 + 3]).toBe(0);
    }
  });
  test("the server reports every group linked, with its logo", async () => {
    expect(await describeInvites()).toEqual({ groups: 4, found: 4, linked: 4, logos: 4, verified: 4 });
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
  test("a placeholder link gives no invite, and an unknown group id has none", async () => {
    const dir = folder({ "g.txt": `${PLACEHOLDER_LINK}\n` });
    expect(await readInvite(dir, "g")).toBeNull();
    expect(await readInvite(dir, "missing")).toBeNull();
    expect(await inviteForGroup("A2 · Kadın 1", dir)).toBeNull();
  });
  test("a group without a logo still gets a plain QR code that decodes to its link", async () => {
    const invite = await readInvite(folder({ "g.txt": REAL_LINK }), "g");
    const png = pngOf(invite!.qr);
    const { js, zx } = decodeBoth(new Uint8ClampedArray(png.data), png.width, png.height);
    expect([js, zx]).toEqual([REAL_LINK, REAL_LINK]);
  });
});

describe("each group's QR code with its logo", () => {
  for (const g of WHATSAPP_GROUPS) {
    test(`${g.file}: decodes to exactly its link with jsQR and ZXing, at the page's size and at half`, async () => {
      const invite = await inviteForGroup(g.id);
      expect(invite?.url).toBe(EXPECTED_LINKS[g.file]!);
      expect(invite!.qr.length).toBeLessThan(150 * 1024);
      const png = pngOf(invite!.qr);
      expect(png.width).toBe(invite!.width * 2); // drawn at 2x for sharp screens
      expect(invite!.width).toBeGreaterThanOrEqual(240);
      for (const scale of [1, 0.5]) {
        const w = Math.round(invite!.width * scale);
        const img = resizeRGBA(png.data, png.width, png.height, w, w);
        const { js, zx } = decodeBoth(img, w, w);
        expect({ scale, js, zx }).toEqual({ scale, js: EXPECTED_LINKS[g.file]!, zx: EXPECTED_LINKS[g.file]! });
      }
    });
  }
  test("the logo sits in the middle: the centre pixel is the logo, not a module or white", async () => {
    const invite = await inviteForGroup("Erkek+");
    const png = pngOf(invite!.qr);
    const c = (png.height / 2) * png.width * 4 + (png.width / 2) * 4;
    const px = [png.data[c], png.data[c + 1], png.data[c + 2]];
    expect(px).not.toEqual([255, 255, 255]);
    expect(px).not.toEqual([0x15, 0x24, 0x48]);
  });
});
