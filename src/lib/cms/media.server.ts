import { ImageError, toWebp } from "./images/convert.server";
import { isWebp, stripWebpMetadata } from "./images/webp";
import { repo } from "./repo/index.server";
import { StoreError } from "./store.server";

/**
 * Uploads: at most 10 MB, any common image format, stored as WebP with all metadata removed:
 * on Docker in DATA_DIR/media, on Workers in R2 (binding MEDIA). The encoder depends on the host
 * (images/convert.server.ts); whichever ran, EXIF, XMP and ICC chunks are stripped here.
 */
export const MAX_UPLOAD = 10 * 1024 * 1024;

const randomHex = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");

/** Converts an uploaded image to WebP (EXIF, GPS and colour profiles are not kept) and stores it. */
export async function saveUpload(input: Uint8Array): Promise<{ src: string; width: number; height: number; bytes: number }> {
  if (input.byteLength === 0) throw new StoreError("الملف فارغ.");
  if (input.byteLength > MAX_UPLOAD) throw new StoreError("الحد الأقصى لحجم الصورة 10 ميغابايت.", 413);
  let converted;
  try {
    converted = await toWebp(input);
  } catch (e) {
    if (e instanceof ImageError) throw new StoreError(e.message, e.status);
    throw e;
  }
  if (!isWebp(converted.data)) throw new StoreError("تعذّر تحويل الصورة.", 500);
  const data = stripWebpMetadata(converted.data);
  const name = `${randomHex(12)}.webp`;
  await (await repo()).putBlob(`media/${name}`, data, "image/webp");
  console.info(`[media] ${name}: ${converted.width}×${converted.height} WebP, ${data.byteLength} bytes (${converted.encoder})`);
  return { src: `/media/${name}`, width: converted.width, height: converted.height, bytes: data.byteLength };
}

export { MEDIA_NAME, readMedia, readShareImage, SHARE_NAME } from "./media-read.server";
