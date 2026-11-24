/* eslint-disable @typescript-eslint/no-require-imports -- a standalone CommonJS script run with node */
// Renders the share images public/images/og/og-<lang>.png (1200×630): the lockup (emblem, the
// name in the page language's form, tagline) in cream on navy, and the hero's heading.
//
// Fonts: Amiri (Arabic) and Carlito (Latin), the self-hosted files in public/fonts; Calibri is never
// used, so the images look the same on any machine. The script checks with Chrome which fonts it
// actually drew with, and fails if anything else was used.
//
// Usage (the site running, e.g. `bun run build && bun run start`; Playwright from npx):
//   node scripts/share-images.cjs <playwright-node_modules-dir> <site-url>
const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(process.argv[2], "playwright"));
const BASE = process.argv[3] || "http://localhost:3000";
const REPO = path.join(__dirname, "..");
const site = JSON.parse(fs.readFileSync(path.join(REPO, "content/site.json"), "utf8"));
const svg = fs.readFileSync(path.join(REPO, "public/images/shukraan-emblem.svg"), "utf8");
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

const LINE = {
  tr: "Dr. Jehan Ziyad ile canlı Arapça konuşma pratiği · Zoom · A2–B2",
  en: "Live Arabic speaking practice with Dr. Jehan Ziyad · Zoom · A2–B2",
  ar: "ممارسة المحادثة العربية مباشرةً مع الدكتورة جيهان زياد · Zoom · A2–B2",
};

// The same faces as src/styles.css, from the site's own /fonts.
const FACES = [
  ...[400, 700].map((w) => `@font-face{font-family:"Amiri";font-weight:${w};src:url(/fonts/amiri-arabic-${w}-normal.woff2) format("woff2");unicode-range:U+0600-06FF,U+0750-077F,U+0870-08FF,U+200C-200E,U+2010-2011,U+FB50-FDFF,U+FE70-FEFC}`),
  ...[400, 700].flatMap((w) =>
    ["normal", "italic"].flatMap((st) =>
      ["latin", "latin-ext"].map((sub) => `@font-face{font-family:"Carlito";font-weight:${w};font-style:${st};src:url(/fonts/carlito-${sub}-${w}-${st}.woff2) format("woff2")${sub === "latin" ? ";unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212" : ";unicode-range:U+0100-02BA,U+02BD-02FF,U+1E00-1EFF,U+20A0-20C0"}}`),
    ),
  ),
].join("\n");

const nameFor = (lang) => site.brand.names?.[lang] || site.brand.names?.en;

function html(lang) {
  const page = JSON.parse(fs.readFileSync(path.join(REPO, `content/pages/standart/${lang}.json`), "utf8"));
  const hero = page.sections.find((s) => s.type === "hero").fields;
  const dir = site.languages.find((l) => l.code === lang).dir;
  const tagline = site.tagline[lang] || site.tagline[site.fallbackLanguage];
  const ar = lang === "ar";
  const name = nameFor(lang)
    .split(/\s*\|\s*/)
    .map((part) => `<bdi dir="${ARABIC.test(part) ? "rtl" : "ltr"}" class="${ARABIC.test(part) ? "nar" : "nla"}">${esc(part)}</bdi>`)
    .join('<span class="sep"> | </span>');
  const emblem = svg.replace("<svg ", '<svg class="emblem" ');
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8">
<style>
${FACES}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:#071027;color:#f3ead7;font-family:"Amiri","Carlito",sans-serif;position:relative}
.pattern{position:absolute;inset:0;opacity:.18;background-image:radial-gradient(circle at 50% 50%,transparent 38%,#d0a348 39%,transparent 40%),radial-gradient(circle at 0 0,transparent 38%,#d0a348 39%,transparent 40%),radial-gradient(circle at 100% 100%,transparent 38%,#d0a348 39%,transparent 40%);background-size:64px 64px}
.wrap{position:absolute;inset:56px 64px;display:flex;flex-direction:column;justify-content:space-between}
.lockup{display:flex;align-items:center;gap:28px;color:#f3ead7}
.emblem{width:100px;height:auto;flex:none}
.t{display:flex;flex-direction:column;gap:8px}
.name{font-weight:700;line-height:1.4}
.nar{font-family:"Amiri","Carlito",sans-serif;font-size:38px}
.nla{font-family:"Carlito",sans-serif;font-size:34px}
.sep{opacity:.7;font-weight:400;font-size:32px}
.tg{font-size:${ar ? 24 : 21}px;line-height:${ar ? 1.7 : 1.45};max-width:900px}
.rule{height:2px;width:220px;background:linear-gradient(90deg,transparent,#d0a348,transparent)}
h1{font-weight:700;font-size:${ar ? 52 : 58}px;line-height:${ar ? 1.45 : 1.1};color:#f3ead7}
h1 em{display:block;color:#d0a348;font-style:${ar ? "normal" : "italic"}}
.line{font-size:22px;opacity:.85}
</style></head><body><div class="pattern"></div><div class="wrap">
<div class="lockup">${emblem}<span class="t"><span class="name">${name}</span><span class="tg">${esc(tagline)}</span></span></div>
<div><div class="rule"></div><h1 style="margin-top:22px">${esc(hero.title)}<em>${esc(hero.titleAccent)}</em></h1></div>
<p class="line">${esc(LINE[lang])}</p>
</div></body></html>`;
}

/** Every font Chrome drew the page's text with, from the DevTools protocol. */
async function fontsUsed(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "body *" });
  const used = new Map();
  for (const nodeId of nodeIds) {
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId }).catch(() => ({ fonts: [] }));
    for (const f of fonts) used.set(f.familyName, (used.get(f.familyName) || 0) + f.glyphCount);
  }
  return Object.fromEntries(used);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const out = path.join(REPO, "public/images/og");
  fs.mkdirSync(out, { recursive: true });
  let bad = false;
  for (const lang of ["tr", "en", "ar"]) {
    // Served from the site's own origin, so /fonts loads.
    await page.route(BASE + "/__share-image", (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: html(lang) }));
    await page.goto(BASE + "/__share-image", { waitUntil: "networkidle" });
    await page.unroute(BASE + "/__share-image");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const fits = await page.evaluate(() => document.querySelector(".wrap").scrollHeight <= document.querySelector(".wrap").clientHeight + 1);
    const fonts = await fontsUsed(page);
    const others = Object.keys(fonts).filter((f) => f !== "Amiri" && f !== "Carlito");
    if (!fits || others.length) bad = true;
    await page.screenshot({ path: path.join(out, `og-${lang}.png`) });
    console.log(`${lang}: fits=${fits} fonts=${JSON.stringify(fonts)}${others.length ? " OTHER FONTS: " + others.join(", ") : ""}`);
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
