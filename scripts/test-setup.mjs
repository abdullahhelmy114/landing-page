// Bun test preload (bunfig.toml): makes sure the bundled WhatsApp data exists before any test imports it.
import { mock } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { bundleWhatsapp, OUT } from "./bundle-whatsapp.mjs";

// "server-only" guards modules from the browser bundle; outside Next.js it has nothing to do.
mock.module("server-only", () => ({}));

if (!existsSync(OUT)) {
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(bundleWhatsapp()));
}
