/// <reference types="bun" />
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

import { MAX_UPLOAD, readMedia, saveUpload } from "./media.server";
import { getAt } from "./ops";
import {
  applyDraftOps,
  duplicatePage,
  hasUnpublished,
  KEEP_VERSIONS,
  listPages,
  listVersions,
  publish,
  readDraft,
  readPublished,
  readTrash,
  restoreFromTrash,
  restoreVersion,
  StoreError,
  updateMeta,
  writeDraftSettings,
  writeSite,
  readSite,
} from "./store.server";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "shukraan-data-"));
  process.env["DATA_DIR"] = dir;
});
afterEach(() => {
  delete process.env["DATA_DIR"];
  rmSync(dir, { recursive: true, force: true });
});

const TITLE = ["sections", "#top", "fields", "title"];

describe("Pages from the seed", () => {
  test("the standard page is published in tr, en and ar straight from content/", async () => {
    const p = await readPublished("standart");
    expect(Object.keys(p!.content).sort()).toEqual(["ar", "en", "tr"]);
    expect(p!.meta).toMatchObject({ slug: "standart", archived: false });
    expect(await listPages()).toEqual([expect.objectContaining({ slug: "standart", published: true, isStandard: true })]);
    expect(await hasUnpublished("standart")).toBe(false);
  });
});

describe("Draft and publish", () => {
  test("edits go to the draft; visitors see them only after publishing", async () => {
    await applyDraftOps("standart", [{ op: "setText", lang: "tr", path: TITLE, value: "Yeni başlık" }]);
    expect(getAt((await readDraft("standart"))!.content["tr"], TITLE)).toBe("Yeni başlık");
    expect(getAt((await readPublished("standart"))!.content["tr"], TITLE)).toBe("Arapça biliyorsun.");
    expect(await hasUnpublished("standart")).toBe(true);
    const v = await publish("standart", "first");
    expect(getAt((await readPublished("standart"))!.content["tr"], TITLE)).toBe("Yeni başlık");
    expect(await hasUnpublished("standart")).toBe(false);
    expect(await listVersions("standart")).toEqual([{ id: v.id, publishedAt: v.publishedAt, note: "first" }]);
  });
  test("rich text is sanitised before it is stored", async () => {
    await applyDraftOps("standart", [{ op: "setText", lang: "en", path: ["sections", "#top", "fields", "bodyHtml"], value: '<b>Hi</b><img src=x onerror="alert(1)"><script>x</script>' }]);
    expect(getAt((await readDraft("standart"))!.content["en"], ["sections", "#top", "fields", "bodyHtml"])).toBe("<b>Hi</b>");
  });
  test("every publish keeps a version; only the last 30 are kept", async () => {
    const t0 = Date.UTC(2026, 10, 1);
    for (let i = 0; i < KEEP_VERSIONS + 2; i++) {
      await applyDraftOps("standart", [{ op: "setText", lang: "tr", path: TITLE, value: `Başlık ${i}` }]);
      await publish("standart", `v${i}`, new Date(t0 + i * 60_000));
    }
    const versions = await listVersions("standart");
    expect(versions).toHaveLength(KEEP_VERSIONS);
    expect(versions[0]!.note).toBe(`v${KEEP_VERSIONS + 1}`);
    expect(versions.at(-1)!.note).toBe("v2");
  });
  test("restoring a version puts it in the draft (published stays until the next publish)", async () => {
    await applyDraftOps("standart", [{ op: "setText", lang: "ar", path: TITLE, value: "أ" }]);
    const first = await publish("standart", "", new Date(Date.UTC(2026, 10, 1)));
    await applyDraftOps("standart", [{ op: "setText", lang: "ar", path: TITLE, value: "ب" }]);
    await publish("standart", "", new Date(Date.UTC(2026, 10, 2)));
    await restoreVersion("standart", first.id);
    expect(getAt((await readDraft("standart"))!.content["ar"], TITLE)).toBe("أ");
    expect(getAt((await readPublished("standart"))!.content["ar"], TITLE)).toBe("ب");
    await publish("standart");
    expect(getAt((await readPublished("standart"))!.content["ar"], TITLE)).toBe("أ");
  });
  test("settings are part of the draft, checked, and published with it", async () => {
    const d = await readDraft("standart");
    await writeDraftSettings("standart", { ...d!.settings, lockup: { header: { tone: "navy", scheme: 4 }, footer: { tone: "gold", scheme: "auto" } } });
    expect((await readPublished("standart"))!.settings.lockup.header.scheme).toBe("auto");
    await publish("standart");
    expect((await readPublished("standart"))!.settings.lockup.header.scheme).toBe(4);
  });
});

describe("Trash", () => {
  test("a deleted section waits in the trash and comes back in every language", async () => {
    await applyDraftOps("standart", [{ op: "deleteSection", id: "sss" }], new Date("2026-11-23T10:00:00Z"));
    const d = await readDraft("standart");
    for (const l of ["tr", "en", "ar"]) expect(d!.content[l]!.sections.map((s) => s.id)).not.toContain("sss");
    const trash = await readTrash("standart", new Date("2026-11-24T10:00:00Z"));
    expect(trash.map((t) => t.id)).toEqual(["sss"]);
    await restoreFromTrash("standart", "sss", new Date("2026-11-24T10:00:00Z"));
    const back = await readDraft("standart");
    for (const l of ["tr", "en", "ar"]) expect(back!.content[l]!.sections.map((s) => s.id)).toContain("sss");
    expect(await readTrash("standart", new Date("2026-11-24T10:00:00Z"))).toEqual([]);
  });
  test("deleted sections are kept 30 days, then dropped", async () => {
    await applyDraftOps("standart", [{ op: "deleteSection", id: "kapanis" }], new Date("2026-11-01T10:00:00Z"));
    expect(await readTrash("standart", new Date("2026-12-01T09:59:00Z"))).toHaveLength(1);
    expect(await readTrash("standart", new Date("2026-12-01T10:01:00Z"))).toHaveLength(0);
    await expect(restoreFromTrash("standart", "kapanis", new Date("2026-12-02T00:00:00Z"))).rejects.toBeInstanceOf(StoreError);
  });
});

describe("Duplicate, rename, archive", () => {
  test("«Duplicate page» copies all three languages to a new slug, unpublished", async () => {
    await applyDraftOps("standart", [{ op: "setText", lang: "en", path: TITLE, value: "Draft title" }]);
    const meta = await duplicatePage("standart", "tecvid", "Tecvid Kursu");
    expect(meta).toMatchObject({ slug: "tecvid", courseName: "Tecvid Kursu", archived: false });
    const copy = await readDraft("tecvid");
    expect(Object.keys(copy!.content).sort()).toEqual(["ar", "en", "tr"]);
    expect(getAt(copy!.content["en"], TITLE)).toBe("Draft title");
    expect(copy!.content["ar"]!.sections.map((s) => s.id)).toEqual((await readDraft("standart"))!.content["ar"]!.sections.map((s) => s.id));
    expect(await readPublished("tecvid")).toBeNull();
    await publish("tecvid");
    expect(await readPublished("tecvid")).not.toBeNull();
    // Edits to the copy leave the original alone.
    await applyDraftOps("tecvid", [{ op: "deleteSection", id: "ornekler" }]);
    expect((await readDraft("standart"))!.content["tr"]!.sections.map((s) => s.id)).toContain("ornekler");
  });
  test("slugs must be new, simple and not reserved", async () => {
    for (const bad of ["Bad Slug", "admin", "en", "dad40", "-x", "standart", "a/b"]) await expect(duplicatePage("standart", bad, "X")).rejects.toBeInstanceOf(StoreError);
    await duplicatePage("standart", "kurs-2", "Kurs 2");
    await expect(duplicatePage("standart", "kurs-2", "Again")).rejects.toBeInstanceOf(StoreError);
  });
  test("rename, move to a new slug, archive and restore", async () => {
    await duplicatePage("standart", "eski", "Eski");
    await updateMeta("eski", { courseName: "Yeni ad", slug: "yeni" });
    expect(await readDraft("eski")).toBeNull();
    expect((await readDraft("yeni"))!.meta).toMatchObject({ slug: "yeni", courseName: "Yeni ad" });
    await publish("yeni");
    await updateMeta("yeni", { archived: true });
    expect((await readPublished("yeni"))!.meta.archived).toBe(true);
    await updateMeta("yeni", { archived: false });
    expect((await readPublished("yeni"))!.meta.archived).toBe(false);
    await expect(updateMeta("standart", { slug: "other" })).rejects.toBeInstanceOf(StoreError);
    await expect(updateMeta("standart", { archived: true })).rejects.toBeInstanceOf(StoreError);
  });
});

describe("Languages", () => {
  test("adding a language needs no code: pages start from the English copy, the tagline falls back", async () => {
    const site = await readSite();
    await writeSite({ ...site, languages: [...site.languages, { code: "fr", label: "Français", dir: "ltr" }] });
    const d = await readDraft("standart");
    expect(Object.keys(d!.content).sort()).toEqual(["ar", "en", "fr", "tr"]);
    expect(getAt(d!.content["fr"], TITLE)).toBe(getAt(d!.content["en"], TITLE));
    await applyDraftOps("standart", [{ op: "setText", lang: "fr", path: TITLE, value: "Bonjour" }]);
    expect(getAt((await readDraft("standart"))!.content["fr"], TITLE)).toBe("Bonjour");
  });
});

describe("Uploads", () => {
  const photo = () =>
    sharp({ create: { width: 64, height: 48, channels: 3, background: "#d0a348" } })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: "Secret Person", Artist: "Secret Person" } }, orientation: 6 })
      .toBuffer();

  test("an image is stored as WebP with its metadata removed (and turned upright first)", async () => {
    const input = await photo();
    const before = await sharp(input).metadata();
    expect(before.exif).toBeDefined();
    const r = await saveUpload(new Uint8Array(input));
    expect(r.src).toMatch(/^\/media\/[a-f0-9]{24}\.webp$/);
    const stored = await readMedia(r.src.slice("/media/".length));
    const meta = await sharp(stored!).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    expect([meta.width, meta.height]).toEqual([48, 64]);
    expect(stored!.includes(Buffer.from("Secret Person"))).toBe(false);
    expect(readdirSync(path.join(dir, "media"))).toEqual([r.src.slice("/media/".length)]);
  });
  test("files over 10 MB are refused", async () => {
    const big = new Uint8Array(MAX_UPLOAD + 1);
    await expect(saveUpload(big)).rejects.toMatchObject({ status: 413 });
  });
  test("anything that is not an image is refused", async () => {
    await expect(saveUpload(new TextEncoder().encode("<svg onload=alert(1)>"))).rejects.toMatchObject({ status: 415 });
    await expect(saveUpload(new Uint8Array(0))).rejects.toBeInstanceOf(StoreError);
  });
  test("only stored file names can be read back (no paths)", async () => {
    expect(await readMedia("../site.json")).toBeNull();
    expect(await readMedia("0123456789abcdef01234567.png")).toBeNull();
    expect(await readMedia("0123456789abcdef01234567.webp")).toBeNull();
  });
});
