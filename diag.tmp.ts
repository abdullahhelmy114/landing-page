import { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from "@zxing/library";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { WHATSAPP_GROUPS } from "./src/components/shukraan/data";
import { inviteForGroup, resizeRGBA } from "./src/lib/whatsapp-invites";
let fails = 0; const bad: string[] = [];
for (const g of WHATSAPP_GROUPS) {
  const inv = await inviteForGroup(g.id);
  const png = PNG.sync.read(Buffer.from(inv!.qr.split(",")[1]!, "base64"));
  for (const w of [260, 250, 245, 240, 230, 200, 160, 130, 123, 122, 115]) {
    const img = resizeRGBA(png.data, png.width, png.height, w, w);
    const js = jsQR(img, w, w, { inversionAttempts: "dontInvert" })?.data ?? null;
    const lum = new Uint8ClampedArray(w * w);
    for (let i = 0; i < w * w; i++) lum[i] = (img[i * 4]! * 299 + img[i * 4 + 1]! * 587 + img[i * 4 + 2]! * 114) / 1000;
    let zx: string | null = null;
    try { zx = new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, w, w))), new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]], [DecodeHintType.TRY_HARDER, true]])).getText(); } catch {}
    if (js !== inv!.url) { fails++; bad.push(`${g.file}@${w}:js`); }
    if (zx !== inv!.url) { fails++; bad.push(`${g.file}@${w}:zx`); }
  }
}
console.log(`fails=${fails} ${bad.join(" ")}`);
