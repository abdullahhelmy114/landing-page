/**
 * A small PNG reader and writer on the standard CompressionStream / DecompressionStream, so it runs
 * the same on Node.js and on Cloudflare Workers (pngjs's synchronous inflate subclasses Node's zlib
 * classes, which workerd does not allow). Reads non-interlaced PNGs: 8-bit of every colour type,
 * and 1/2/4-bit grey and palette images; writes 8-bit RGB.
 */
export type RGBAImage = { width: number; height: number; data: Uint8Array };

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Decodes a PNG into straight-alpha RGBA. */
export async function decodePng(bytes: Uint8Array): Promise<RGBAImage> {
  if (!SIGNATURE.every((b, i) => bytes[i] === b)) throw new Error("not a PNG");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 8;
  let width = 0, height = 0, depth = 0, type = 0, interlace = 0;
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  while (at + 8 <= bytes.length) {
    const len = view.getUint32(at);
    const id = String.fromCharCode(bytes[at + 4]!, bytes[at + 5]!, bytes[at + 6]!, bytes[at + 7]!);
    const data = bytes.subarray(at + 8, at + 8 + len);
    if (id === "IHDR") {
      width = view.getUint32(at + 8);
      height = view.getUint32(at + 12);
      depth = data[8]!;
      type = data[9]!;
      interlace = data[12]!;
    } else if (id === "PLTE") palette = data;
    else if (id === "tRNS") trns = data;
    else if (id === "IDAT") idat.push(data);
    else if (id === "IEND") break;
    at += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (!channels) throw new Error("unknown PNG colour type");
  // 8-bit for every colour type; 1, 2 and 4 bits for grey and palette images (what optimisers write).
  const packed = depth < 8 && (type === 0 || type === 3) && [1, 2, 4].includes(depth);
  if ((depth !== 8 && !packed) || interlace !== 0) throw new Error("only 8-bit (or packed grey/palette), non-interlaced PNGs are read");
  const joined = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of idat) {
    joined.set(c, o);
    o += c.length;
  }
  const raw = await pipe(joined, new DecompressionStream("deflate"));
  const stride = Math.ceil((width * channels * depth) / 8);
  const bpp = Math.max(1, (channels * depth) / 8);
  if (raw.length < (stride + 1) * height) throw new Error("PNG image data is truncated");
  const rows = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? rows[y * stride + x - bpp]! : 0;
      const b = y > 0 ? rows[(y - 1) * stride + x]! : 0;
      const c = x >= bpp && y > 0 ? rows[(y - 1) * stride + x - bpp]! : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0;
      rows[y * stride + x] = (line[x]! + pred) & 0xff;
    }
  }
  // Sample k of row y (a packed sample is read from its bits, most significant first).
  const sample = (y: number, k: number) => {
    if (depth === 8) return rows[y * stride + k]!;
    const bit = k * depth;
    return (rows[y * stride + (bit >> 3)]! >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
  };
  const greyScale = 255 / ((1 << depth) - 1);
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const y = Math.floor(i / width);
    const s = (i % width) * channels;
    let r: number, g: number, b: number, alpha = 255;
    if (type === 0 || type === 4) {
      const v = sample(y, s);
      r = g = b = Math.round(v * greyScale);
      if (type === 4) alpha = sample(y, s + 1);
      else if (trns && trns.length >= 2 && ((trns[0]! << 8) | trns[1]!) === v) alpha = 0;
    } else if (type === 3) {
      const k = sample(y, s);
      r = palette?.[k * 3] ?? 0;
      g = palette?.[k * 3 + 1] ?? 0;
      b = palette?.[k * 3 + 2] ?? 0;
      alpha = trns && k < trns.length ? trns[k]! : 255;
    } else {
      r = sample(y, s);
      g = sample(y, s + 1);
      b = sample(y, s + 2);
      if (type === 6) alpha = sample(y, s + 3);
    }
    out.set([r, g, b, alpha], i * 4);
  }
  return { width, height, data: out };
}

/** Encodes RGBA pixels as an 8-bit RGB PNG (the alpha channel is dropped). */
export async function encodePngRGB(img: RGBAImage): Promise<Uint8Array> {
  const { width, height, data } = img;
  const stride = width * 3;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    // Filter "Up" (2): good compression for the QR code's long runs.
    raw[y * (stride + 1)] = 2;
    for (let x = 0; x < width; x++) {
      for (let k = 0; k < 3; k++) {
        const v = data[(y * width + x) * 4 + k]!;
        const up = y > 0 ? data[((y - 1) * width + x) * 4 + k]! : 0;
        raw[y * (stride + 1) + 1 + x * 3 + k] = (v - up) & 0xff;
      }
    }
  }
  const idat = await pipe(raw, new CompressionStream("deflate"));
  const chunk = (id: string, body: Uint8Array) => {
    const out = new Uint8Array(12 + body.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, body.length);
    for (let i = 0; i < 4; i++) out[4 + i] = id.charCodeAt(i);
    out.set(body, 8);
    dv.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const hv = new DataView(ihdr.buffer);
  hv.setUint32(0, width);
  hv.setUint32(4, height);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit, RGB, deflate, filters, no interlace
  const parts = [new Uint8Array(SIGNATURE), chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", new Uint8Array(0))];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    png.set(p, o);
    o += p.length;
  }
  return png;
}
