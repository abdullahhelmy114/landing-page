/**
 * Pure JavaScript pixel helpers for the WebAssembly image path: the EXIF orientation of a JPEG,
 * turning the pixels upright, and an area-averaging resize.
 */
export type Pixels = { data: Uint8ClampedArray; width: number; height: number };

/** The EXIF orientation (1–8) of a JPEG, or 1 when it has none. */
export function jpegOrientation(b: Uint8Array): number {
  if (b[0] !== 0xff || b[1] !== 0xd8) return 1;
  let at = 2;
  while (at + 4 <= b.length && b[at] === 0xff) {
    const marker = b[at + 1]!;
    const len = (b[at + 2]! << 8) | b[at + 3]!;
    if (marker === 0xda || len < 2) break; // image data starts: no more metadata
    if (marker === 0xe1 && b[at + 4] === 0x45 && b[at + 5] === 0x78 && b[at + 6] === 0x69 && b[at + 7] === 0x66) {
      const t = at + 10; // TIFF header after "Exif\0\0"
      const le = b[t] === 0x49;
      const u16 = (o: number) => (le ? b[o]! | (b[o + 1]! << 8) : (b[o]! << 8) | b[o + 1]!);
      const u32 = (o: number) => (le ? (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0 : ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0);
      const ifd = t + u32(t + 4);
      const count = u16(ifd);
      for (let i = 0; i < count; i++) {
        const e = ifd + 2 + i * 12;
        if (e + 12 > b.length) break;
        if (u16(e) === 0x0112) {
          const v = u16(e + 8);
          return v >= 1 && v <= 8 ? v : 1;
        }
      }
      return 1;
    }
    at += 2 + len;
  }
  return 1;
}

/** The pixels turned upright for an EXIF orientation (1 = already upright). */
export function orient(img: Pixels, o: number): Pixels {
  if (o <= 1 || o > 8) return img;
  const { width: w, height: h, data } = img;
  const swap = o >= 5;
  const W = swap ? h : w;
  const H = swap ? w : h;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let X = x;
      let Y = y;
      switch (o) {
        case 2: X = w - 1 - x; break;
        case 3: X = w - 1 - x; Y = h - 1 - y; break;
        case 4: Y = h - 1 - y; break;
        case 5: X = y; Y = x; break;
        case 6: X = h - 1 - y; Y = x; break;
        case 7: X = h - 1 - y; Y = w - 1 - x; break;
        case 8: X = y; Y = w - 1 - x; break;
      }
      const s = (y * w + x) * 4;
      const d = (Y * W + X) * 4;
      out[d] = data[s]!;
      out[d + 1] = data[s + 1]!;
      out[d + 2] = data[s + 2]!;
      out[d + 3] = data[s + 3]!;
    }
  }
  return { data: out, width: W, height: H };
}

/** The image scaled down (never up) so its longest side is at most `max`, by area averaging. */
export function resizeImage(img: Pixels, max: number): Pixels {
  const { width: sw, height: sh, data: src } = img;
  const scale = Math.min(1, max / Math.max(sw, sh));
  if (scale >= 1) return img;
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const out = new Uint8ClampedArray(dw * dh * 4);
  const fx = sw / dw;
  const fy = sh / dh;
  for (let y = 0; y < dh; y++) {
    const y0 = y * fy;
    const y1 = y0 + fy;
    for (let x = 0; x < dw; x++) {
      const x0 = x * fx;
      const x1 = x0 + fx;
      let r = 0, g = 0, b = 0, a = 0, w = 0;
      for (let yy = Math.floor(y0); yy < Math.min(sh, Math.ceil(y1)); yy++) {
        const wy = Math.min(y1, yy + 1) - Math.max(y0, yy);
        for (let xx = Math.floor(x0); xx < Math.min(sw, Math.ceil(x1)); xx++) {
          const wt = wy * (Math.min(x1, xx + 1) - Math.max(x0, xx));
          const i = (yy * sw + xx) * 4;
          r += src[i]! * wt;
          g += src[i + 1]! * wt;
          b += src[i + 2]! * wt;
          a += src[i + 3]! * wt;
          w += wt;
        }
      }
      const o = (y * dw + x) * 4;
      out[o] = r / w;
      out[o + 1] = g / w;
      out[o + 2] = b / w;
      out[o + 3] = a / w;
    }
  }
  return { data: out, width: dw, height: dh };
}
