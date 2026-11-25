import { applyOp, type Drafts, type Op, OpError } from "./ops";
import { dataDir, repo } from "./repo/index.server";
import type { Repo, Stage, StoredStage } from "./repo/types";
import { sanitizeContent, sanitizeSettings } from "./sanitize.server";
import { SEED_PAGES, SEED_SITE } from "./seed";
import type { PageMeta, PageSettings, SiteConfig, TrashEntry, VersionInfo } from "./types";

/**
 * The control panel's rules for pages: the seed fallback, drafts and publishing, the last 30
 * versions, the 30-day trash, duplicating, renaming and archiving. Where the data lives is the
 * repo's business (repo/): files under DATA_DIR on Docker, D1 and R2 on Cloudflare Workers.
 *
 * A page that exists only in the seed (content/, built into the bundle) is published as it is
 * there; the first change copies it into the store.
 */

export const KEEP_VERSIONS = 30;
export const TRASH_DAYS = 30;

export { dataDir };

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
const RESERVED = new Set(["admin", "api", "media", "images", "preview", "share", "fonts", "icons", "og", "_next", "favicon.ico", "robots.txt", "sitemap.xml", "manifest.webmanifest", "dad40", "konusma40"]);

export const isLangCode = (s: string) => LANG.test(s);
export const isSlug = (s: string) => SLUG.test(s);

export function checkSlug(slug: string, site: SiteConfig) {
  if (!SLUG.test(slug)) throw new StoreError("الرابط المختصر يقبل الحروف اللاتينية الصغيرة والأرقام والشرطة فقط.");
  if (RESERVED.has(slug) || site.languages.some((l) => l.code === slug)) throw new StoreError("هذا الرابط محجوز.");
}

/** One change at a time per page (and for the site record), within this server instance. */
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

const randomHex = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");

// ── Site ─────────────────────────────────────────────────────────────────────────────────────
export async function readSite(): Promise<SiteConfig> {
  return (await (await repo()).getSite()) ?? structuredClone(SEED_SITE);
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
    await (await repo()).putSite(site);
    return site;
  });
}

// ── Pages ────────────────────────────────────────────────────────────────────────────────────
/** A page's content and settings in every language of the site (a missing language starts as the fallback's copy). */
export type PageState = { meta: PageMeta; settings: PageSettings; content: Drafts };

async function readStage(r: Repo, slug: string, stage: Stage, site: SiteConfig): Promise<PageState | null> {
  const stored = await r.getMeta(slug);
  const seed = SEED_PAGES[slug];
  const meta = stored ?? seed?.meta ?? null;
  if (!meta) return null;
  // Where this stage lives: the store, or the seed (for a page never changed in the store).
  let data: StoredStage | null = await r.getStage(slug, stage);
  if (!data && stage === "draft") data = await r.getStage(slug, "published");
  if (!data && !stored && seed) data = { settings: seed.settings, content: seed.content };
  if (!data) return null;
  const content: Drafts = {};
  const fallback = data.content[site.fallbackLanguage] ?? null;
  for (const l of site.languages) {
    const c = data.content[l.code] ?? fallback ?? Object.values(data.content)[0] ?? null;
    if (c) content[l.code] = structuredClone(c);
  }
  if (!Object.keys(content).length) return null;
  return { meta: structuredClone(meta), settings: structuredClone(data.settings), content };
}

export const readPublished = async (slug: string, site?: SiteConfig) => readStage(await repo(), slug, "published", site ?? (await readSite()));
export const readDraft = async (slug: string, site?: SiteConfig) => readStage(await repo(), slug, "draft", site ?? (await readSite()));

/** Copies a seed-only page into the store (published and draft), so it can change. */
async function materialize(r: Repo, slug: string, site: SiteConfig) {
  if (await r.getMeta(slug)) return;
  const seed = await readStage(r, slug, "published", site);
  if (!seed) throw new StoreError("الصفحة غير موجودة.", 404);
  await r.putStage(slug, "published", seed);
  await r.putStage(slug, "draft", seed);
  await r.putMeta(slug, seed.meta);
}

export type PageSummary = PageMeta & { published: boolean; isStandard: boolean };

export async function listPages(): Promise<PageSummary[]> {
  const r = await repo();
  const site = await readSite();
  const slugs = new Set([...Object.keys(SEED_PAGES), ...(await r.listSlugs())]);
  const out: PageSummary[] = [];
  for (const slug of slugs) {
    const meta = (await r.getMeta(slug)) ?? SEED_PAGES[slug]?.meta ?? null;
    if (!meta) continue;
    const published = (await readStage(r, slug, "published", site)) !== null;
    out.push({ ...meta, slug, published, isStandard: slug === site.standardPage });
  }
  return out.sort((a, b) => Number(b.isStandard) - Number(a.isStandard) || a.courseName.localeCompare(b.courseName));
}

export async function readMeta(slug: string): Promise<PageMeta | null> {
  return (await (await repo()).getMeta(slug)) ?? SEED_PAGES[slug]?.meta ?? null;
}

async function touch(r: Repo, slug: string, now: Date) {
  const meta = await r.getMeta(slug);
  if (meta) await r.putMeta(slug, { ...meta, updatedAt: now.toISOString() });
}

/** Applies panel operations to the draft (sanitised); returns the new draft. */
export async function applyDraftOps(slug: string, ops: Op[], now = new Date()) {
  return locked(slug, async () => {
    const r = await repo();
    const site = await readSite();
    await materialize(r, slug, site);
    const draft = await readStage(r, slug, "draft", site);
    if (!draft) throw new StoreError("الصفحة غير موجودة.", 404);
    const trash: TrashEntry[] = [];
    try {
      for (const op of ops) {
        if (op.op === "restoreSection") throw new OpError("use the trash");
        const res = applyOp(draft.content, op, now);
        if (res.trash) trash.push(res.trash);
      }
    } catch (e) {
      if (e instanceof OpError) throw new StoreError(e.message);
      throw e;
    }
    for (const [code, c] of Object.entries(draft.content)) draft.content[code] = sanitizeContent(c);
    await r.putStage(slug, "draft", draft);
    if (trash.length) await r.putTrash(slug, [...trash, ...(await readTrashFrom(r, slug, now))]);
    await touch(r, slug, now);
    return draft;
  });
}

export async function writeDraftSettings(slug: string, settings: PageSettings, now = new Date()) {
  return locked(slug, async () => {
    const r = await repo();
    const site = await readSite();
    await materialize(r, slug, site);
    const draft = await readStage(r, slug, "draft", site);
    if (!draft) throw new StoreError("الصفحة غير موجودة.", 404);
    draft.settings = sanitizeSettings(settings);
    await r.putStage(slug, "draft", draft);
    await touch(r, slug, now);
    return draft;
  });
}

// ── Publishing and versions ──────────────────────────────────────────────────────────────────
/** Publishes the draft and keeps it as a version (the last 30 are kept). */
export async function publish(slug: string, note = "", now = new Date()) {
  return locked(slug, async () => {
    const r = await repo();
    const site = await readSite();
    await materialize(r, slug, site);
    const draft = await readStage(r, slug, "draft", site);
    if (!draft) throw new StoreError("الصفحة غير موجودة.", 404);
    await r.putStage(slug, "published", draft);
    const id = `${now.toISOString().replace(/[:.]/g, "-")}-${randomHex(2)}`;
    await r.putVersion(slug, { id, publishedAt: now.toISOString(), note: note.slice(0, 200), settings: draft.settings, content: draft.content }, KEEP_VERSIONS);
    const meta = await r.getMeta(slug);
    if (meta) await r.putMeta(slug, { ...meta, publishedAt: now.toISOString() });
    return { id, publishedAt: now.toISOString() };
  });
}

export async function listVersions(slug: string): Promise<VersionInfo[]> {
  return (await repo()).listVersions(slug);
}

/** Puts a published version back into the draft (publish it to make it live again). */
export async function restoreVersion(slug: string, id: string, now = new Date()) {
  if (!/^[\w-]+$/.test(id)) throw new StoreError("نسخة غير معروفة.", 404);
  return locked(slug, async () => {
    const r = await repo();
    const v = await r.getVersion(slug, id);
    if (!v) throw new StoreError("نسخة غير معروفة.", 404);
    const site = await readSite();
    const draft = await readStage(r, slug, "draft", site);
    if (!draft) throw new StoreError("الصفحة غير موجودة.", 404);
    // Languages added since then start from the fallback language's copy.
    const content: Drafts = {};
    for (const l of site.languages) {
      const c = v.content[l.code] ?? v.content[site.fallbackLanguage] ?? Object.values(v.content)[0];
      if (c) content[l.code] = c;
    }
    await r.putStage(slug, "draft", { settings: v.settings, content });
    await touch(r, slug, now);
    return { ...draft, settings: v.settings, content };
  });
}

// ── Trash ────────────────────────────────────────────────────────────────────────────────────
async function readTrashFrom(r: Repo, slug: string, now: Date): Promise<TrashEntry[]> {
  const cutoff = now.getTime() - TRASH_DAYS * 86_400_000;
  return (await r.getTrash(slug)).filter((e) => Date.parse(e.deletedAt) >= cutoff);
}

/** Deleted sections from the last 30 days (older ones are dropped). */
export async function readTrash(slug: string, now = new Date()): Promise<TrashEntry[]> {
  return readTrashFrom(await repo(), slug, now);
}

/** Puts a deleted section back where it was, in every language. */
export async function restoreFromTrash(slug: string, id: string, now = new Date()) {
  return locked(slug, async () => {
    const r = await repo();
    const site = await readSite();
    const trash = await readTrashFrom(r, slug, now);
    const entry = trash.find((e) => e.id === id);
    if (!entry) throw new StoreError("لم يعد هذا القسم في سلة المحذوفات.", 404);
    const draft = await readStage(r, slug, "draft", site);
    if (!draft) throw new StoreError("الصفحة غير موجودة.", 404);
    try {
      applyOp(draft.content, { op: "restoreSection", entry }, now);
    } catch (e) {
      if (e instanceof OpError) throw new StoreError(e.message);
      throw e;
    }
    for (const [code, c] of Object.entries(draft.content)) draft.content[code] = sanitizeContent(c);
    await r.putStage(slug, "draft", draft);
    await r.putTrash(
      slug,
      trash.filter((e) => e.id !== id),
    );
    await touch(r, slug, now);
    return draft;
  });
}

// ── Duplicate, rename, archive ───────────────────────────────────────────────────────────────
const taken = async (r: Repo, slug: string) => (await r.pageExists(slug)) || slug in SEED_PAGES;

/** Copies a page's draft in every language to a new slug (not published yet). */
export async function duplicatePage(from: string, to: string, courseName: string, now = new Date()) {
  const site = await readSite();
  checkSlug(to, site);
  return locked(to, async () => {
    const r = await repo();
    if (await taken(r, to)) throw new StoreError("هذا الرابط مستخدم لصفحة أخرى.");
    const src = await readStage(r, from, "draft", site);
    if (!src) throw new StoreError("الصفحة غير موجودة.", 404);
    await r.putStage(to, "draft", { settings: src.settings, content: src.content });
    const meta: PageMeta = { slug: to, courseName: courseName.trim().slice(0, 120) || src.meta.courseName, archived: false, createdAt: now.toISOString(), updatedAt: now.toISOString() };
    await r.putMeta(to, meta);
    return meta;
  });
}

/** Renames a page (course name) and, for pages other than the standard one, moves it to a new slug. */
export async function updateMeta(slug: string, patch: { courseName?: string; slug?: string; archived?: boolean }, now = new Date()) {
  const site = await readSite();
  return locked(slug, async () => {
    const r = await repo();
    await materialize(r, slug, site);
    const meta = await r.getMeta(slug);
    if (!meta) throw new StoreError("الصفحة غير موجودة.", 404);
    const next: PageMeta = { ...meta, updatedAt: now.toISOString() };
    if (patch.courseName !== undefined) next.courseName = patch.courseName.trim().slice(0, 120) || meta.courseName;
    if (patch.archived !== undefined) {
      if (patch.archived && slug === site.standardPage) throw new StoreError("لا يمكن أرشفة الصفحة القياسية.");
      next.archived = patch.archived;
    }
    let at = slug;
    if (patch.slug !== undefined && patch.slug !== slug) {
      if (slug === site.standardPage || slug in SEED_PAGES) throw new StoreError("لا يمكن تغيير رابط هذه الصفحة.");
      checkSlug(patch.slug, site);
      if (await taken(r, patch.slug)) throw new StoreError("هذا الرابط مستخدم لصفحة أخرى.");
      await r.movePage(slug, patch.slug);
      at = patch.slug;
      next.slug = patch.slug;
    }
    await r.putMeta(at, next);
    return next;
  });
}

/** Whether a page has unpublished changes (its draft differs from what visitors see). */
export async function hasUnpublished(slug: string) {
  const r = await repo();
  const site = await readSite();
  const [d, p] = await Promise.all([readStage(r, slug, "draft", site), readStage(r, slug, "published", site)]);
  if (!d) return false;
  if (!p) return true;
  return JSON.stringify([d.settings, d.content]) !== JSON.stringify([p.settings, p.content]);
}
