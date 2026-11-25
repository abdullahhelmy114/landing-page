import { repo } from "./repo/index.server";

/** Reading stored images (no image codecs here, so the routes that serve images stay small). */
export const MEDIA_NAME = /^[a-f0-9]{24}\.webp$/;
export const SHARE_NAME = /^og-[a-z]{2,3}\.png$/;

export async function readMedia(name: string): Promise<Uint8Array | null> {
  if (!MEDIA_NAME.test(name)) return null;
  return (await (await repo()).getBlob(`media/${name}`))?.data ?? null;
}

/** A share image stored by scripts/import-seed.mjs (R2) or in DATA_DIR/share; null when absent. */
export async function readShareImage(name: string): Promise<Uint8Array | null> {
  if (!SHARE_NAME.test(name)) return null;
  return (await (await repo()).getBlob(`share/${name}`))?.data ?? null;
}
