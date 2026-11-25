/**
 * Pure JavaScript helpers for WebP files (RIFF container), usable on any host: reading the size,
 * and removing metadata (EXIF, XMP and ICC colour-profile chunks) whatever encoder produced the file.
 */

const fourcc = (b: Uint8Array, at: number) => String.fromCharCode(b[at]!, b[at + 1]!, b[at + 2]!, b[at + 3]!);
const u32 = (b: Uint8Array, at: number) => (b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16) | (b[at + 3]! << 24)) >>> 0;
const u24 = (b: Uint8Array, at: number) => b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16);

export const isWebp = (b: Uint8Array) => b.length >= 16 && fourcc(b, 0) === "RIFF" && fourcc(b, 8) === "WEBP";

type Chunk = { id: string; data: Uint8Array };

function chunks(b: Uint8Array): Chunk[] {
  const out: Chunk[] = [];
  let at = 12;
  while (at + 8 <= b.length) {
    const id = fourcc(b, at);
    const size = u32(b, at + 4);
    const start = at + 8;
    if (start + size > b.length) throw new Error("truncated WebP");
    out.push({ id, data: b.subarray(start, start + size) });
    at = start + size + (size & 1);
  }
  return out;
}

/** The image's width and height, from its VP8X, VP8 or VP8L chunk. */
export function webpSize(b: Uint8Array): { width: number; height: number } | null {
  if (!isWebp(b)) return null;
  for (const { id, data: d } of chunks(b)) {
    if (id === "VP8X" && d.length >= 10) return { width: u24(d, 4) + 1, height: u24(d, 7) + 1 };
    if (id === "VP8 " && d.length >= 10 && d[3] === 0x9d && d[4] === 0x01 && d[5] === 0x2a)
      return { width: (d[6]! | (d[7]! << 8)) & 0x3fff, height: (d[8]! | (d[9]! << 8)) & 0x3fff };
    if (id === "VP8L" && d.length >= 5 && d[0] === 0x2f)
      return { width: 1 + (((d[2]! & 0x3f) << 8) | d[1]!), height: 1 + (((d[4]! & 0x0f) << 10) | (d[3]! << 2) | ((d[2]! & 0xc0) >> 6)) };
  }
  return null;
}

const METADATA = new Set(["EXIF", "XMP ", "ICCP"]);
const VP8X_ICC = 0x20;
const VP8X_EXIF = 0x08;
const VP8X_XMP = 0x04;

/** The same WebP without EXIF, XMP or ICC chunks (and with the VP8X flags that announce them cleared). */
export function stripWebpMetadata(b: Uint8Array): Uint8Array {
  if (!isWebp(b)) throw new Error("not a WebP file");
  const kept = chunks(b)
    .filter((c) => !METADATA.has(c.id))
    .map((c) => {
      if (c.id !== "VP8X") return c;
      const d = new Uint8Array(c.data);
      d[0] = d[0]! & ~(VP8X_ICC | VP8X_EXIF | VP8X_XMP);
      return { id: c.id, data: d };
    });
  const size = 4 + kept.reduce((n, c) => n + 8 + c.data.length + (c.data.length & 1), 0);
  const out = new Uint8Array(8 + size);
  const view = new DataView(out.buffer);
  out.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  view.setUint32(4, size, true);
  out.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  let at = 12;
  for (const c of kept) {
    for (let i = 0; i < 4; i++) out[at + i] = c.id.charCodeAt(i);
    view.setUint32(at + 4, c.data.length, true);
    out.set(c.data, at + 8);
    at += 8 + c.data.length + (c.data.length & 1);
  }
  return out;
}
