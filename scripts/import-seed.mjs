// One-time import of the seed (content/*.json) into Cloudflare D1, and of the share images
// (public/images/og/og-<lang>.png) into R2. Run after `wrangler d1 migrations apply`.
//
//   node scripts/import-seed.mjs --remote          the deployed database and bucket
//   node scripts/import-seed.mjs --local           wrangler dev's local copies
//   add --force to overwrite pages already edited in the panel (otherwise they are left alone)
//
// Bindings (wrangler.jsonc): D1 "landing-page" (binding DB), R2 "landing-page-media" (binding MEDIA).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATABASE = "landing-page";
const BUCKET = "landing-page-media";

const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

/** The SQL that loads the site settings and every seed page (draft and published) into D1. */
export function buildSeedSql({ force = false, now = new Date().toISOString() } = {}) {
  const verb = force ? "INSERT OR REPLACE" : "INSERT OR IGNORE";
  const sql = [
    `${verb} INTO site (id, config, updated_at) VALUES (1, ${q(JSON.stringify(read("content/site.json")))}, ${q(now)});`,
  ];
  const pagesDir = path.join(ROOT, "content/pages");
  for (const slug of readdirSync(pagesDir)) {
    const dir = `content/pages/${slug}`;
    const meta = read(`${dir}/meta.json`);
    const settings = read(`${dir}/settings.json`);
    sql.push(
      `${verb} INTO pages (slug, meta, updated_at) VALUES (${q(slug)}, ${q(JSON.stringify({ ...meta, slug }))}, ${q(now)});`,
    );
    for (const stage of ["published", "draft"]) {
      sql.push(
        `${verb} INTO page_settings (slug, stage, settings) VALUES (${q(slug)}, ${q(stage)}, ${q(JSON.stringify(settings))});`,
      );
      for (const f of readdirSync(path.join(ROOT, dir))) {
        if (!f.endsWith(".json") || f === "meta.json" || f === "settings.json") continue;
        const lang = f.slice(0, -5);
        sql.push(
          `${verb} INTO page_content (slug, stage, lang, content) VALUES (${q(slug)}, ${q(stage)}, ${q(lang)}, ${q(JSON.stringify(read(`${dir}/${f}`)))});`,
        );
      }
    }
  }

  return sql;
}

function main() {
  const args = process.argv.slice(2);
  const where = args.includes("--local")
    ? "--local"
    : args.includes("--remote")
      ? "--remote"
      : null;
  if (!where) {
    console.error("Say where: --remote (Cloudflare) or --local (wrangler dev).");
    process.exit(2);
  }
  const force = args.includes("--force");
  const sql = buildSeedSql({ force });
  const tmp = path.join(ROOT, ".wrangler/tmp");
  mkdirSync(tmp, { recursive: true });
  const file = path.join(tmp, "seed.sql");
  writeFileSync(file, sql.join("\n") + "\n");

  const wrangler = (...a) =>
    execFileSync(
      process.execPath,
      [path.join(ROOT, "node_modules/wrangler/bin/wrangler.js"), ...a],
      { cwd: ROOT, stdio: "inherit" },
    );

  console.log(
    `D1 ${DATABASE} (${where}): ${sql.length} statements${force ? " (overwriting)" : " (existing rows kept)"}`,
  );
  wrangler("d1", "execute", DATABASE, where, "--file", file, "--yes");

  // ── Share images into R2 (served at /share/og-<lang>.png) ──────────────────────────────────────
  const og = path.join(ROOT, "public/images/og");
  for (const f of existsSync(og)
    ? readdirSync(og).filter((n) => /^og-[a-z]{2,3}\.png$/.test(n))
    : []) {
    console.log(`R2 ${BUCKET}/share/${f} (${where})`);
    wrangler(
      "r2",
      "object",
      "put",
      `${BUCKET}/share/${f}`,
      "--file",
      path.join(og, f),
      "--content-type",
      "image/png",
      where,
    );
  }
  console.log("Done. Open /admin to check the pages.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
