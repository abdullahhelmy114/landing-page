import { readShareImage, SHARE_NAME } from "@/lib/cms/media-read.server";

// Share images (og-<language>.png, drawn with Amiri and Carlito by scripts/share-images.cjs): from R2
// on Cloudflare (scripts/import-seed.mjs uploads them) or DATA_DIR/share on Docker; when the store
// has none, the copy built into the site (public/images/og) is used.
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!SHARE_NAME.test(file)) return new Response("Not found", { status: 404 });
  const data = await readShareImage(file);
  if (!data) return Response.redirect(new URL(`/images/og/${file}`, req.url), 302);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
