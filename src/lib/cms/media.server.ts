import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp, { type Metadata } from "sharp";

import { dataDir, StoreError } from "./store.server";

/** Uploads: at most 10 MB, any common image format, stored as WebP with all metadata removed. */
export const MAX_UPLOAD = 10 * 1024 * 1024;
const MAX_SIDE = 2400;
const FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "tiff", "heif"]);
export const MEDIA_NAME = /^[a-f0-9]{24}\.webp$/;

export const mediaDir = () => path.join(dataDir(), "media");

/** Converts an uploaded image to WebP (EXIF, GPS and colour profiles are not kept) and stores it. */
export async function saveUpload(input: Uint8Array): Promise<{ src: string; width: number; height: number; bytes: number }> {
  if (input.byteLength === 0) throw new StoreError("الملف فارغ.");
  if (input.byteLength > MAX_UPLOAD) throw new StoreError("الحد الأقصى لحجم الصورة 10 ميغابايت.", 413);
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new StoreError("هذا الملف ليس صورة.", 415);
  }
  if (!meta.format || !FORMATS.has(meta.format)) throw new StoreError("صيغة الصورة غير مدعومة.", 415);
  // Rotate by the EXIF orientation first, since the orientation tag is dropped with the rest.
  const { data, info } = await sharp(input, { limitInputPixels: 60_000_000, animated: false })
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const name = `${randomBytes(12).toString("hex")}.webp`;
  await fs.mkdir(mediaDir(), { recursive: true });
  await fs.writeFile(path.join(mediaDir(), name), data);
  return { src: `/media/${name}`, width: info.width, height: info.height, bytes: data.byteLength };
}

export async function readMedia(name: string): Promise<Buffer | null> {
  if (!MEDIA_NAME.test(name)) return null;
  try {
    return await fs.readFile(path.join(mediaDir(), name));
  } catch {
    return null;
  }
}
