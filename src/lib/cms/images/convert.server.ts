import { cloudflareEnv, usesCloudflare } from "../repo/index.server";
import type { ImagesBinding } from "../repo/types";
import { webpSize } from "./webp";

/**
 * Turns an uploaded image into WebP (at most 2400 px on its longest side, turned upright by its EXIF
 * orientation, metadata not kept). The encoder depends on the host:
 *   - Docker / Node.js: sharp;
 *   - Cloudflare Workers: the Images binding (IMAGES) when the Worker has one, else (or when the
 *     binding fails, e.g. Images is not available on the account) a WebAssembly encoder (jSquash:
 *     MozJPEG / libpng / libwebp decoders and the libwebp encoder).
 * The caller strips any metadata chunk afterwards whichever encoder ran (images/webp.ts).
 */
export const MAX_SIDE = 2400;
export const QUALITY = 82;
const FORMATS = new Set(["jpeg", "jpg", "png", "webp", "gif", "avif", "tiff", "heif"]);

export class ImageError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
const notAnImage = () => new ImageError("هذا الملف ليس صورة.", 415);
/** The Images binding could not read or convert the file: the WebAssembly encoder decides instead. */
class BindingFailed extends Error {}
const unsupported = () => new ImageError("صيغة الصورة غير مدعومة.", 415);

export type Converted = { data: Uint8Array; width: number; height: number; encoder: "sharp" | "images-binding" | "wasm" };

export async function toWebp(input: Uint8Array): Promise<Converted> {
  if (usesCloudflare()) {
    const env = await cloudflareEnv();
    if (env.IMAGES) {
      try {
        return await viaImagesBinding(env.IMAGES, input);
      } catch (error) {
        if (!(error instanceof BindingFailed)) throw error;
        console.warn("[images] the Images binding failed; converting with the WebAssembly encoder:", error.cause);
      }
    }
    // wasm.server.ts in the Cloudflare build (CF_BUILD=1, see next.config.ts); a stub elsewhere.
    const { viaWasm } = await import("@/lib/cms/images/wasm-codec");
    return viaWasm(input);
  }
  return viaSharp(input);
}

async function viaSharp(input: Uint8Array): Promise<Converted> {
  // Loaded only here, so a Worker never loads sharp's native module.
  const sharp = (await import("sharp")).default;
  let format: string | undefined;
  try {
    format = (await sharp(input, { limitInputPixels: 60_000_000 }).metadata()).format;
  } catch {
    throw notAnImage();
  }
  if (!format || !FORMATS.has(format)) throw unsupported();
  // Turned upright by the EXIF orientation first, since every metadata tag is dropped.
  const { data, info } = await sharp(input, { limitInputPixels: 60_000_000, animated: false })
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height, encoder: "sharp" };
}

async function viaImagesBinding(images: ImagesBinding, input: Uint8Array): Promise<Converted> {
  const stream = () => new Response(new Uint8Array(input)).body as ReadableStream<Uint8Array>;
  let format: string;
  try {
    format = (await images.info(stream())).format;
  } catch (cause) {
    // Not an image, or the binding is unavailable: the WebAssembly decoders tell which.
    throw new BindingFailed("info", { cause });
  }
  if (!FORMATS.has(format.replace(/^image\//, ""))) throw unsupported();
  // The Images binding turns the image upright by its EXIF orientation and drops metadata on WebP output.
  let data: Uint8Array;
  try {
    const out = await images
      .input(stream())
      .transform({ width: MAX_SIDE, height: MAX_SIDE, fit: "scale-down" })
      .output({ format: "image/webp", quality: QUALITY, anim: false });
    data = new Uint8Array(await out.response().arrayBuffer());
  } catch (cause) {
    throw new BindingFailed("transform", { cause });
  }
  const size = webpSize(data);
  if (!size) throw new BindingFailed("output is not WebP");
  return { data, ...size, encoder: "images-binding" };
}
