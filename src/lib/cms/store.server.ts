import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { applyOp, type Drafts, type Op, OpError } from "./ops";
import { sanitizeContent, sanitizeSettings } from "./sanitize.server";
import type { LangContent, PageMeta, PageSettings, SiteConfig, TrashEntry, VersionInfo } from "./types";

/**
 * Page content on disk. The repository's content/ folder holds the seed (the standard template);
 * DATA_DIR (a persistent volume, /app/data in Docker) holds everything the panel writes:
 *
 *   site.json                      languages, brand and taglines (once edited)
 *   pages/<slug>/meta.json         course name, slug, archived flag
 *   pages/<slug>/draft/…           settings.json and one <language>.json per language
 *   pages/<slug>/published/…       the same, as visitors see it
 *   pages/<slug>/versions/<id>.json  every publish (the last 30 are kept)
 *   pages/<slug>/trash.json        deleted sections (kept 30 days)
 *   media/<id>.webp                uploaded images
 *
 * A page that exists only in content/ is published as it is there; the first change copies it to
 * the volume.
 */

export const KEEP_VERSIONS = 30;
export const TRASH_DAYS = 30;

export const dataDir = () => process.env["DATA_DIR"] || path.join(process.cwd(), "data");
export const contentDir = () => process.env["CONTENT_DIR"] || path.join(process.cwd(), "content");

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;
const LANG = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/;
/** Paths the site already uses, so no page can take them. */
const RESERVED = new Set(["admin", "api", "media", "images", "preview", "og", "_next", "favicon.ico", "robots.txt", "sitemap.xml", "dad40", "konusma40"]);

export const isLangCode = (s: string) => LANG.test(s);

export function checkSlug(slug: string, site: SiteConfig) {
  if (!SLUG.test(slug)) throw new StoreError("الرابط المختصر يقبل الحروف اللاتينية الصغيرة والأرقام والشرطة فقط.");
  if (RESERVED.has(slug) || site.languages.some((l) => l.code === slug)) throw new StoreError("هذا الرابط محجوز.");
}

// ── Files ────────────────────────────────────────────────────────────────────────────────────
async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** Writes a file atomically (a temporary file, then a rename). */
async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, file);
}

const exists = async (p: string) =>
  fs.stat(p).then(
    () => true,
    () => false,
  );

const listDirs = async (p: string) => {
  try {
    return (await fs.readdir(p, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
};

/** One change at a time per page (and for the site file). */
const locks = new Map<string, Promise<unknown>>();
function locked<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  locks.set(
    key,
    run.catch(() => undefined),
  );
  return run;
}

// ── Site ─────────────────────────────────────────────────────────────────────────────────────
export async function readSite(): Promise<SiteConfig> {
  const site = (await readJson<SiteConfig>(path.join(dataDir(), "site.json"))) ?? (await readJson<SiteConfig>(path.join(contentDir(), "site.json")));
  if (!site) throw new StoreError("content/site.json is missing", 500);
  return site;
}

/** Saves languages and taglines. Adding a language here is all a new language needs. */
export async function writeSite(next: SiteConfig) {
  return locked("site", async () => {
    const langs = next.languages.filter((l) => isLangCode(l.code) && l.label.trim());
    if (!langs.length) throw new StoreError("يجب أن تبقى لغة واحدة على الأقل.");
    if (new Set(langs.map((l) => l.code)).size !== langs.length) throw new StoreError("رمز اللغة مكرر.");
    const codes = langs.map((l) => l.code);
    const pick = (c: string, fallback: string) => (codes.includes(c) ? c : fallback);
    const site: SiteConfig = {
      defaultLanguage: pick(next.defaultLanguage, codes[0]!),
      fallbackLanguage: pick(next.fallbackLanguage, codes.includes("en") ? "en" : codes[0]!),
      standardPage: next.standardPage,
      languages: langs.map((l) => ({ code: l.code, label: l.label.trim().slice(0, 40), dir: l.dir === "rtl" ? "rtl" : "ltr" })),
      brand: {
        arabic: String(next.brand.arabic).slice(0, 120),
        latin: String(next.brand.latin).slice(0, 120),
        names: Object.fromEntries(
          Object.entries(next.brand.names ?? {})
            .filter(([k, v]) => isLangCode(k) && typeof v === "string" && v.trim())
            .map(([k, v]) => [k, v.trim().slice(0, 200)]),
        ),
      },
      tagline: Object.fromEntries(Object.entries(next.tagline).filter(([k, v]) => isLangCode(k) && typeof v === "string").map(([k, v]) => [k, v.slice(0, 400)])),
    };
    await writeJson(path.join(dataDir(), "site.json"), site);
    return site;
  });
}

// ── Pages ────────────────────────────────────────────────────────────────────────────────────
const pageDir = (slug: string) => path.join(dataDir(), "pages", slug);
const seedDir = (slug: string) => path.join(contentDir(), "pages", slug);

type Stage = "draft" | "published";

/** A page's content and settings in every language of the site (a missing language starts as the fallback's copy). */
export type PageState = { meta: PageMeta; settings: PageSettings; content: Drafts };

async function readStage(slug: string, stage: Stage, site: SiteConfig): Promise<PageState | null> {
  const dir = pageDir(slug);
  const meta = (await readJson<PageMeta>(path.join(dir, "meta.json"))) ?? (await readJson<PageMeta>(path.join(seedDir(slug), "meta.json")));
  if (!meta) return null;
  // Where this stage lives: the volume, or the seed (for a page never changed on the volume).
  let base: string | null = null;
  if (await exists(path.join(dir, stage, "settings.json"))) base = path.join(dir, stage);
  else if (stage === "draft" && (await exists(path.join(dir, "published", "settings.json")))) base = path.join(dir, "published");
  else if (!(await exists(path.join(dir, "meta.json"))) && (await exists(path.join(seedDir(slug), "settings.json")))) base = seedDir(slug);
  if (!base) return null;
  const settings = await readJson<PageSettings>(path.join(base, "settings.json"));
  if (!settings) return null;
  const content: Drafts = {};
  let fallback: LangContent | null = null;
  const loadFallback = async () => (fallback ??= await readJson<LangContent>(path.join(base, `${site.fallbackLanguage}.json`)));
  for (const l of site.languages) {
    const own = await readJson<LangContent>(path.join(base, `${l.code}.json`));
    const c = own ?? (await loadFallback()) ?? Object.values(content)[0] ?? null;
    if (c) content[l.code] = structuredClone(c);
  }
  if (!Object.keys(content).length) return null;
  return { meta, settings, content };
}

export const readPublished = async (slug: string, site?: SiteConfig) => {
  const s = site ?? (await readSite());
  return readStage(slug, "published", s);
};
export const readDraft = async (slug: string, site?: SiteConfig) => {
  const s = site ?? (await readSite());
  return readStage(slug, "draft", s);
};

async function writeStage(slug: string, stage: Stage, state: Omit<PageState, "meta">) {
  const dir = path.join(pageDir(slug), stage);
  await writeJson(path.join(dir, "settings.json"), state.settings);
  for (const [code, c] of Object.entries(state.content)) await writeJson(path.join(dir, `${code}.json`), c);
}

/** Copies a seed-only page onto the volume (published and draft), so it can change. */
async function materialize(slug: string, site: SiteConfig) {
  if (await exists(path.join(pageDir(slug), "meta.json"))) return;
  const seed = await readStage(slug, "published", site);
  if (!seed) throw new StoreError("الصفحة غير موجودة.", 404);
  await writeStage(slug, "published", seed);
  await writeStage(slug, "draft", seed);
  await writeJson(path.join(pageDir(slug), "meta.json"), seed.meta);
}

export type PageSummary = PageMeta & { published: boolean; isStandard: boolean };

export async function listPages(): Promise<PageSummary[]> {
  const site = await readSite();
  const slugs = new Set([...(await listDirs(path.join(contentDir(), "pages"))), ...(await listDirs(path.join(dataDir(), "pages")))]);
  const out: PageSummary[] = [];
  for (const slug of slugs) {
    const meta = (await readJson<PageMeta>(path.join(pageDir(slug), "meta.json"))) ?? (await readJson<PageMeta>(path.join(seedDir(slug), "meta.json")));
    if (!meta) continue;
    const published = (await readStage(slug, "published", site)) !== null;
    out.push({ ...meta, slug, published, isStandard: slug === site.standardPage });
  }
  return out.sort((a, b) => Number(b.isStandard) - Number(a.isStandard) || a.courseName.localeCompare(b.courseName));
}

export async function readMeta(slug: string): Promise<PageMeta | null> {
  return (await readJson<PageMeta>(path.join(pageDir(slug), "meta.json"))) ?? (await readJson<PageMeta>(path.join(seedDir(slug), "meta.json")));
}

/** Applies panel operations to the draft (sanitised); returns the new draft. */
export async function applyDraftOps(slug: string, ops: Op[], now = new Date()) {
  return locked(slug, async () => {
    const site = await readSite();
    await materialize(slug, site);
    const draft = await readStage(slug, "draft", site);
    if (!draft) throw new StoreError("الصفحة غير موجودة.", 404);
    const trash: TrashEntry[] = [];
    try {
      for (const op of ops) {
        if (op.op === "restoreSection") throw new OpError("use the trash");
        const r = applyOp(draft.content, op, now);
        if (r.trash) trash.push(r.trash);
      }
    } catch (e) {
      if (e instanceof OpError) throw new StoreError(e.message);
      throw e;
    }
    for (const [code, c] of Object.entries(draft.content)) draft.content[code] = sanitizeContent(c);
    await writeStage(slug, "draft", draft);
    if (trash.length) await writeTrash(slug, [...trash, ...(await readTrash(slug, now))]);
    await touch(slug, now);
    return draft;
  });
}

export async function writeDraftSettings(slug: string, settings: PageSettings, now = new Date()) {
  return locked(slug, async () => {
    const site = await readSite();
    await materialize(slug, site);
    const draft = await readStage(slug, "draft", site);
    if (!draft) throw new StoreError("الصفحة غير موجودة.", 404);
    draft.settings = sanitizeSettings(settings);
    await writeStage(slug, "draft", draft);
    await touch(slug, now);
    return draft;
  });
}

async function touch(slug: string, now: Date) {
  const file = path.join(pageDir(slug), "meta.json");
  const meta = await readJson<PageMeta>(file);
  if (meta) await writeJson(file, { ...meta, updatedAt: now.toISOString() });
}

// ── Publishing and versions ──────────────────────────────────────────────────────────────────
type VersionFile = VersionInfo & { settings: PageSettings; content: Drafts };

const versionsDir = (slug: string) => path.join(pageDir(slug), "versions");

/** Publishes the draft and keeps it as a version (the last 30 are kept). */
export async function publish(slug: string, note = "", now = new Date()) {
  return locked(slug, async () => {
    const site = await readSite();
    await materialize(slug, site);
    const draft = await readStage(slug, "draft", site);
    if (!draft) throw new StoreError("الصفحة غير موجودة.", 404);
    await writeStage(slug, "published", draft);
    const id = `${now.toISOString().replace(/[:.]/g, "-")}-${randomBytes(2).toString("hex")}`;
    const version: VersionFile = { id, publishedAt: now.toISOString(), note: note.slice(0, 200), settings: draft.settings, content: draft.content };
    await writeJson(path.join(versionsDir(slug), `${id}.json`), version);
    const all = (await fs.readdir(versionsDir(slug))).filter((f) => f.endsWith(".json")).sort();
    for (const old of all.slice(0, Math.max(0, all.length - KEEP_VERSIONS))) await fs.rm(path.join(versionsDir(slug), old), { force: true });
    const metaFile = path.join(pageDir(slug), "meta.json");
    const meta = await readJson<PageMeta>(metaFile);
    if (meta) await writeJson(metaFile, { ...meta, publishedAt: now.toISOString() });
    return { id, publishedAt: version.publishedAt };
  });
}

export async function listVersions(slug: string): Promise<VersionInfo[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(versionsDir(slug))).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: VersionInfo[] = [];
  for (const f of files.sort().reverse()) {
    const v = await readJson<VersionFile>(path.join(versionsDir(slug), f));
    if (v) out.push({ id: v.id, publishedAt: v.publishedAt, ...(v.note ? { note: v.note } : {}) });
  }
  return out;
}

/** Puts a published version back into the draft (publish it to make it live again). */
export async function restoreVersion(slug: string, id: string, now = new Date()) {
  if (!/^[\w-]+$/.test(id)) throw new StoreError("نسخة غير معروفة.", 404);
  return locked(slug, async () => {
    const v = await readJson<VersionFile>(path.join(versionsDir(slug), `${id}.json`));
    if (!v) throw new StoreError("نسخة غير معروفة.", 404);
    const site = await readSite();
    const draft = await readStage(slug, "draft", site);
    if (!draft) throw new StoreError("الصفحة غير موجودة.", 404);
    // Languages added since then start from the fallback language's copy.
    const content: Drafts = {};
    for (const l of site.languages) {
      const c = v.content[l.code] ?? v.content[site.fallbackLanguage] ?? Object.values(v.content)[0];
      if (c) content[l.code] = c;
    }
    await writeStage(slug, "draft", { settings: v.settings, content });
    await touch(slug, now);
    return { ...draft, settings: v.settings, content };
  });
}

// ── Trash ────────────────────────────────────────────────────────────────────────────────────
const trashFile = (slug: string) => path.join(pageDir(slug), "trash.json");

/** Deleted sections from the last 30 days (older ones are dropped). */
export async function readTrash(slug: string, now = new Date()): Promise<TrashEntry[]> {
  const all = (await readJson<TrashEntry[]>(trashFile(slug))) ?? [];
  const cutoff = now.getTime() - TRASH_DAYS * 86_400_000;
  return all.filter((e) => Date.parse(e.deletedAt) >= cutoff);
}

const writeTrash = (slug: string, entries: TrashEntry[]) => writeJson(trashFile(slug), entries);

/** Puts a deleted section back where it was, in every language. */
export async function restoreFromTrash(slug: string, id: string, now = new Date()) {
  return locked(slug, async () => {
    const site = await readSite();
    const trash = await readTrash(slug, now);
    const entry = trash.find((e) => e.id === id);
    if (!entry) throw new StoreError("لم يعد هذا القسم في سلة المحذوفات.", 404);
    const draft = await readStage(slug, "draft", site);
    if (!draft) throw new StoreError("الصفحة غير موجودة.", 404);
    try {
      applyOp(draft.content, { op: "restoreSection", entry }, now);
    } catch (e) {
      if (e instanceof OpError) throw new StoreError(e.message);
      throw e;
    }
    for (const [code, c] of Object.entries(draft.content)) draft.content[code] = sanitizeContent(c);
    await writeStage(slug, "draft", draft);
    await writeTrash(
      slug,
      trash.filter((e) => e.id !== id),
    );
    await touch(slug, now);
    return draft;
  });
}

// ── Duplicate, rename, archive ───────────────────────────────────────────────────────────────
/** Copies a page's draft in every language to a new slug (not published yet). */
export async function duplicatePage(from: string, to: string, courseName: string, now = new Date()) {
  const site = await readSite();
  checkSlug(to, site);
  return locked(to, async () => {
    if ((await exists(pageDir(to))) || (await exists(seedDir(to)))) throw new StoreError("هذا الرابط مستخدم لصفحة أخرى.");
    const src = await readStage(from, "draft", site);
    if (!src) throw new StoreError("الصفحة غير موجودة.", 404);
    await writeStage(to, "draft", { settings: src.settings, content: src.content });
    const meta: PageMeta = { slug: to, courseName: courseName.trim().slice(0, 120) || src.meta.courseName, archived: false, createdAt: now.toISOString(), updatedAt: now.toISOString() };
    await writeJson(path.join(pageDir(to), "meta.json"), meta);
    return meta;
  });
}

/** Renames a page (course name) and, for pages other than the standard one, moves it to a new slug. */
export async function updateMeta(slug: string, patch: { courseName?: string; slug?: string; archived?: boolean }, now = new Date()) {
  const site = await readSite();
  return locked(slug, async () => {
    await materialize(slug, site);
    const file = path.join(pageDir(slug), "meta.json");
    const meta = await readJson<PageMeta>(file);
    if (!meta) throw new StoreError("الصفحة غير موجودة.", 404);
    const next: PageMeta = { ...meta, updatedAt: now.toISOString() };
    if (patch.courseName !== undefined) next.courseName = patch.courseName.trim().slice(0, 120) || meta.courseName;
    if (patch.archived !== undefined) {
      if (patch.archived && slug === site.standardPage) throw new StoreError("لا يمكن أرشفة الصفحة القياسية.");
      next.archived = patch.archived;
    }
    let at = slug;
    if (patch.slug !== undefined && patch.slug !== slug) {
      if (slug === site.standardPage || (await exists(seedDir(slug)))) throw new StoreError("لا يمكن تغيير رابط هذه الصفحة.");
      checkSlug(patch.slug, site);
      if ((await exists(pageDir(patch.slug))) || (await exists(seedDir(patch.slug)))) throw new StoreError("هذا الرابط مستخدم لصفحة أخرى.");
      await fs.rename(pageDir(slug), pageDir(patch.slug));
      at = patch.slug;
      next.slug = patch.slug;
    }
    await writeJson(path.join(pageDir(at), "meta.json"), next);
    return next;
  });
}

/** Whether a page has unpublished changes (its draft differs from what visitors see). */
export async function hasUnpublished(slug: string) {
  const site = await readSite();
  const [d, p] = await Promise.all([readStage(slug, "draft", site), readStage(slug, "published", site)]);
  if (!d) return false;
  if (!p) return true;
  return JSON.stringify([d.settings, d.content]) !== JSON.stringify([p.settings, p.content]);
}
