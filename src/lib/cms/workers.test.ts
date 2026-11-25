/// <reference types="bun" />
// The pieces that make the site run on Cloudflare Workers as well as on Docker.
import { afterEach, describe, expect, test } from "bun:test";
import { PNG } from "pngjs";
import sharp, { type WebpOptions } from "sharp";

import { decodePng, encodePngRGB } from "@/lib/png";
import { isProbe } from "@/lib/probes";
import { jpegOrientation, orient, resizeImage } from "./images/pixels";
import { isWebp, stripWebpMetadata, webpSize } from "./images/webp";
import { d1Repo } from "./repo/d1.server";
import { useRepo } from "./repo/index.server";
import { memoryR2, sqliteD1 } from "./repo/test-backends";
import { resolveRoute } from "./route.server";
import { SEED_PAGES, SEED_SITE } from "./seed";
import { readDraft, readPublished, readSite, listPages, applyDraftOps } from "./store.server";

// @ts-expect-error: a plain JavaScript module
import { buildSeedSql } from "../../../scripts/import-seed.mjs";

afterEach(() => useRepo(null));

describe("WebP metadata and size (pure JavaScript, any host)", () => {
  test("EXIF, XMP and ICC chunks are removed and the VP8X flags cleared; the picture is untouched", async () => {
    const withMeta = new Uint8Array(
      await sharp({ create: { width: 40, height: 30, channels: 3, background: "#d0a348" } })
        .webp({ quality: 80 })
        .withMetadata({ exif: { IFD0: { Artist: "Hidden Name" } } })
        .withIccProfile("p3")
        .toBuffer(),
    );
    expect(Buffer.from(withMeta).includes(Buffer.from("Hidden Name"))).toBe(true);
    const clean = stripWebpMetadata(withMeta);
    expect(isWebp(clean)).toBe(true);
    expect(Buffer.from(clean).includes(Buffer.from("Hidden Name"))).toBe(false);
    expect(Buffer.from(clean).includes(Buffer.from("ICCP"))).toBe(false);
    const meta = await sharp(clean).metadata();
    expect([meta.format, meta.width, meta.height, meta.exif, meta.icc]).toEqual(["webp", 40, 30, undefined, undefined]);
    expect(webpSize(clean)).toEqual({ width: 40, height: 30 });
    // The compressed picture (the VP8/VP8L chunk) is byte for byte the same.
    const picture = (w: Uint8Array) => {
      const buf = Buffer.from(w);
      const at = Math.max(buf.indexOf("VP8 "), buf.indexOf("VP8L"));
      return buf.subarray(at, at + 8 + buf.readUInt32LE(at + 4));
    };
    expect(picture(clean).length).toBeGreaterThan(8);
    expect(Buffer.compare(picture(withMeta), picture(clean))).toBe(0);
  });
  test("sizes are read from lossy (VP8), lossless (VP8L) and extended (VP8X) files", async () => {
    const make = (o: WebpOptions) => sharp({ create: { width: 123, height: 45, channels: 4, background: "#07102780" } }).webp(o).toBuffer();
    expect(webpSize(new Uint8Array(await make({ quality: 70 })))).toEqual({ width: 123, height: 45 });
    expect(webpSize(new Uint8Array(await make({ lossless: true })))).toEqual({ width: 123, height: 45 });
    expect(webpSize(new TextEncoder().encode("not a webp at all"))).toBeNull();
    expect(() => stripWebpMetadata(new TextEncoder().encode("RIFF____PNG?"))).toThrow();
  });
});

describe("Pixels for the WebAssembly path", () => {
  test("the EXIF orientation of a JPEG is read", async () => {
    for (const o of [1, 3, 6, 8]) {
      const jpg = new Uint8Array(await sharp({ create: { width: 8, height: 4, channels: 3, background: "#fff" } }).jpeg().withMetadata({ orientation: o }).toBuffer());
      expect([o, jpegOrientation(jpg)]).toEqual([o, o]);
    }
    expect(jpegOrientation(new Uint8Array(await sharp({ create: { width: 8, height: 4, channels: 3, background: "#fff" } }).jpeg().toBuffer()))).toBe(1);
  });
  test("pixels are turned upright the way sharp turns them", async () => {
    // A 3×2 image with distinct pixels, then each orientation compared with sharp's rotate().
    const raw = new Uint8ClampedArray(3 * 2 * 4);
    for (let i = 0; i < 6; i++) raw.set([i * 40, 255 - i * 40, i * 10, 255], i * 4);
    for (const o of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const mine = orient({ data: raw, width: 3, height: 2 }, o);
      const jpgless = await sharp(Buffer.from(raw), { raw: { width: 3, height: 2, channels: 4 } }).png().withMetadata({ orientation: o }).toBuffer();
      const { data, info } = await sharp(jpgless).rotate().raw().toBuffer({ resolveWithObject: true });
      expect([o, mine.width, mine.height]).toEqual([o, info.width, info.height]);
      expect([o, Buffer.from(mine.data).equals(Buffer.from(data))]).toEqual([o, true]);
    }
  });
  test("resizing keeps the longest side at most 2400 px and never enlarges", () => {
    const big = { data: new Uint8ClampedArray(4800 * 10 * 4).fill(200), width: 4800, height: 10 };
    expect([resizeImage(big, 2400).width, resizeImage(big, 2400).height]).toEqual([2400, 5]);
    const small = { data: new Uint8ClampedArray(10 * 10 * 4), width: 10, height: 10 };
    expect(resizeImage(small, 2400)).toBe(small);
  });
});

describe("PNG reader and writer on web streams (the QR codes and their logos, any host)", () => {
  // Noise makes the encoder use every PNG row filter (None, Sub, Up, Average, Paeth).
  const noise = (width: number, height: number, channels: number) => {
    let x = 12345;
    const data = new Uint8Array(width * height * channels);
    for (let i = 0; i < data.length; i++) data[i] = (x = (x * 1103515245 + 12345) >>> 0) >>> 24;
    return Buffer.from(data);
  };
  const cases: [string, () => Promise<Buffer>][] = [
    ["grey", () => sharp(noise(37, 23, 1), { raw: { width: 37, height: 23, channels: 1 } }).png().toBuffer()],
    ["grey + alpha", () => sharp(noise(37, 23, 2), { raw: { width: 37, height: 23, channels: 2 } }).png().toBuffer()],
    ["RGB", () => sharp(noise(37, 23, 3), { raw: { width: 37, height: 23, channels: 3 } }).png().toBuffer()],
    ["RGBA", () => sharp(noise(37, 23, 4), { raw: { width: 37, height: 23, channels: 4 } }).png().toBuffer()],
    // 2, 4, 16 and 256 colours: 1, 2, 4 and 8 bits per pixel.
    ...[2, 4, 16, 256].map((colours): [string, () => Promise<Buffer>] => [
      `palette of ${colours} with transparency`,
      () => sharp(noise(37, 23, 4), { raw: { width: 37, height: 23, channels: 4 } }).png({ palette: true, colours, dither: 0 }).toBuffer(),
    ]),
  ];
  for (const [name, make] of cases) {
    test(`${name}: the same pixels as pngjs reads`, async () => {
      const png = await make();
      const reference = PNG.sync.read(png);
      const mine = await decodePng(new Uint8Array(png));
      expect([mine.width, mine.height]).toEqual([reference.width, reference.height]);
      expect(Buffer.from(mine.data).equals(reference.data)).toBe(true);
    });
  }
  test("what it writes reads back the same (RGB, alpha dropped) in pngjs and in itself", async () => {
    const rgba = new Uint8Array(noise(29, 17, 4));
    const png = await encodePngRGB({ width: 29, height: 17, data: rgba });
    const opaque = rgba.map((v, i) => (i % 4 === 3 ? 255 : v));
    expect(Buffer.from(PNG.sync.read(Buffer.from(png)).data).equals(Buffer.from(opaque))).toBe(true);
    expect(Buffer.from((await decodePng(png)).data).equals(Buffer.from(opaque))).toBe(true);
  });
  test("16-bit, interlaced or broken files are refused, not misread", async () => {
    const deep = await sharp(noise(8, 8, 3), { raw: { width: 8, height: 8, channels: 3 } }).toColourspace("rgb16").png().toBuffer();
    await expect(decodePng(new Uint8Array(deep))).rejects.toThrow();
    const interlaced = await sharp(noise(8, 8, 3), { raw: { width: 8, height: 8, channels: 3 } }).png({ progressive: true }).toBuffer();
    await expect(decodePng(new Uint8Array(interlaced))).rejects.toThrow();
    await expect(decodePng(new TextEncoder().encode("not a png"))).rejects.toThrow();
  });
});

describe("Scanners' probes get a 404 before any page runs", () => {
  test("dot files, backups and admin tools of other software", () => {
    for (const p of ["/.env", "/.git/HEAD", "/.ssh/id_rsa", "/.aws/credentials", "/backup.sql", "/db.sql.gz", "/site.zip", "/wp-login.php", "/wp-admin/", "/phpmyadmin/", "/.DS_Store", "/config.json", "/index.php", "/%2e%2e/etc/passwd", "/en/.env", "/old.bak", "/%E0%A4%A"]) expect([p, isProbe(p)]).toEqual([p, true]);
  });
  test("the site's own paths are never blocked", () => {
    for (const p of ["/", "/en", "/ar", "/dad40", "/en/konusma40", "/admin", "/admin/edit/standart/ar", "/api/admin/login", "/preview/standart/tr", "/media/0123456789abcdef01234567.webp", "/share/og-tr.png", "/images/og/og-ar.png", "/fonts/carlito-latin-400-normal.woff2", "/icons/icon-180.png", "/favicon.ico", "/manifest.webmanifest", "/robots.txt", "/.well-known/security.txt", "/tecvid-kursu"]) expect([p, isProbe(p)]).toEqual([p, false]);
  });
  test("anything that cannot be a page is answered without reading the store", async () => {
    useRepo({ kind: "file", getSite: () => { throw new Error("the store was read"); } } as never);
    for (const segs of [[".env"], ["backup.sql"], ["en", ".git"], ["a", "b", "c"], ["x%2Fy"]]) expect(await resolveRoute(segs)).toEqual({ kind: "none" });
  });
});

describe("The seed in D1", () => {
  test("scripts/import-seed.mjs loads the same site and pages the bundled seed serves", async () => {
    const db = sqliteD1();
    for (const stmt of buildSeedSql({ now: "2026-11-25T00:00:00.000Z" }) as string[]) db.sqlite.exec(stmt);
    useRepo(d1Repo(db, memoryR2()));
    expect(await readSite()).toEqual(SEED_SITE);
    const pub = await readPublished("standart");
    expect(pub!.content).toEqual(SEED_PAGES["standart"]!.content);
    expect(pub!.settings).toEqual(SEED_PAGES["standart"]!.settings);
    expect((await readDraft("standart"))!.content).toEqual(SEED_PAGES["standart"]!.content);
    expect((await listPages()).map((p) => [p.slug, p.published])).toEqual([["standart", true]]);
  });
  test("running it again keeps the panel's edits (--force overwrites them)", async () => {
    const db = sqliteD1();
    const run = (force: boolean) => {
      for (const stmt of buildSeedSql({ force }) as string[]) db.sqlite.exec(stmt);
    };
    run(false);
    useRepo(d1Repo(db, memoryR2()));
    await applyDraftOps("standart", [{ op: "setText", lang: "tr", path: ["sections", "#top", "fields", "title"], value: "Panelden" }]);
    run(false);
    expect((await readDraft("standart"))!.content["tr"]!.sections[0]!.fields["title"]).toBe("Panelden");
    run(true);
    expect((await readDraft("standart"))!.content["tr"]!.sections[0]!.fields["title"]).toBe("Arapça biliyorsun.");
  });
});
