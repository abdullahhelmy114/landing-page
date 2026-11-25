// Builds the Cloudflare Worker: the WhatsApp data bundle, `next build` with CF_BUILD=1 (the
// WebAssembly image codecs, see next.config.ts), then OpenNext's Worker bundle (.open-next/).
// On Windows a preload turns OpenNext's symlinks into copies (scripts/windows-symlink-shim.cjs).
// Usage: node scripts/cf-build.mjs   (or `bun run cf:build`)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = (args, env = {}) => execFileSync(process.execPath, args, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } });

run(["scripts/bundle-whatsapp.mjs"]);
run(["node_modules/next/dist/bin/next", "build"], { CF_BUILD: "1" });
run(["-r", "./scripts/windows-symlink-shim.cjs", "node_modules/@opennextjs/cloudflare/dist/cli/index.js", "build", "--skipNextBuild"], { CF_BUILD: "1" });

// OpenNext parses every request's Cookie header with the `cookie` package. Its default import is
// undefined once bundled (cookie@1 is CommonJS marked __esModule, with no default export), which
// failed every request carrying a cookie with "Cannot read properties of undefined (reading
// 'parse')". patches/ switches it to a namespace import; stop here if a bundle still has the old call.
for (const bundle of [".open-next/middleware/handler.mjs", ".open-next/server-functions/default/handler.mjs"]) {
  if (/import_cookie\d*\.default\.parse\(/.test(readFileSync(path.join(ROOT, bundle), "utf8"))) {
    console.error(`${bundle}: the cookie parser is still a default import; run \`bun install\` so patches/ is applied.`);
    process.exit(1);
  }
}
