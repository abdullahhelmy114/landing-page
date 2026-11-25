import type { Converted } from "./convert.server";
import { ImageError } from "./convert.server";

/**
 * The WebAssembly encoder's entry point. This file is what the Docker (Node.js) build sees: sharp
 * converts uploads there, so the codecs are left out of that build. The Cloudflare build
 * (`bun run cf:build`, CF_BUILD=1) points this import at wasm.server.ts instead (next.config.ts).
 */
export async function viaWasm(_input: Uint8Array): Promise<Converted> {
  throw new ImageError("تحويل الصور غير متاح على هذا الخادم.", 503);
}
