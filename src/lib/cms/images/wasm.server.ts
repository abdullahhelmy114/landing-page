import { init as initJpeg } from "@jsquash/jpeg/decode.js";
import decodeJpeg from "@jsquash/jpeg/decode.js";
import { decode as decodePng, init as initPng } from "@jsquash/png/decode.js";
import { init as initWebpDec } from "@jsquash/webp/decode.js";
import decodeWebp from "@jsquash/webp/decode.js";
import { init as initWebpEnc } from "@jsquash/webp/encode.js";
import encodeWebp from "@jsquash/webp/encode.js";
import { simd } from "wasm-feature-detect";
import jpegDecWasm from "@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm?module";
import pngWasm from "@jsquash/png/codec/pkg/squoosh_png_bg.wasm?module";
import webpDecWasm from "@jsquash/webp/codec/dec/webp_dec.wasm?module";
import webpEncWasm from "@jsquash/webp/codec/enc/webp_enc.wasm?module";
import webpEncSimdWasm from "@jsquash/webp/codec/enc/webp_enc_simd.wasm?module";

import { ImageError, MAX_SIDE, QUALITY, type Converted } from "./convert.server";
import { jpegOrientation, orient, resizeImage, type Pixels } from "./pixels";
import { webpSize } from "./webp";

/**
 * The WebAssembly encoder for Workers without an Images binding: jSquash's builds of MozJPEG,
 * libpng and libwebp (Apache-2.0). Workers cannot compile WebAssembly at run time, so each codec is
 * imported as a precompiled module (`?module`) and bundled with the Worker. JPEG, PNG and WebP are
 * read; the EXIF orientation is applied by hand (decoding drops every metadata tag anyway).
 */

// The codecs build ImageData objects, which Workers do not have.
if (typeof (globalThis as { ImageData?: unknown }).ImageData === "undefined") {
  (globalThis as { ImageData?: unknown }).ImageData = class ImageData {
    constructor(
      public data: Uint8ClampedArray,
      public width: number,
      public height: number,
    ) {}
  };
}

let ready: Promise<void> | null = null;
const init = () =>
  (ready ??= (async () => {
    await Promise.all([initJpeg(jpegDecWasm), initPng(pngWasm), initWebpDec(webpDecWasm), initWebpEnc((await simd()) ? webpEncSimdWasm : webpEncWasm)]);
  })());

const kind = (b: Uint8Array) =>
  b[0] === 0xff && b[1] === 0xd8 ? "jpeg" : b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 ? "png" : webpSize(b) ? "webp" : null;

export async function viaWasm(input: Uint8Array): Promise<Converted> {
  const type = kind(input);
  if (!type) throw new ImageError("صيغة الصورة غير مدعومة. ارفع JPEG أو PNG أو WebP.", 415);
  await init();
  const buf = input.slice().buffer;
  let image: Pixels;
  try {
    const decoded = type === "jpeg" ? await decodeJpeg(buf) : type === "png" ? await decodePng(buf) : await decodeWebp(buf);
    image = { data: new Uint8ClampedArray(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength), width: decoded.width, height: decoded.height };
  } catch {
    throw new ImageError("هذا الملف ليس صورة.", 415);
  }
  if (image.width * image.height > 60_000_000) throw new ImageError("الصورة كبيرة جدًّا.", 413);
  if (type === "jpeg") image = orient(image, jpegOrientation(input));
  image = resizeImage(image, MAX_SIDE);
  const out = new Uint8Array(await encodeWebp(image as unknown as ImageData, { quality: QUALITY }));
  const size = webpSize(out);
  if (!size) throw new ImageError("تعذّر تحويل الصورة.", 500);
  return { data: out, ...size, encoder: "wasm" };
}
