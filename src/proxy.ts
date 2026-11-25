import { NextResponse, type NextRequest } from "next/server";

/**
 * Passes the request path to the root layout (for <html lang dir>), and keeps the control panel,
 * preview links and the panel's API out of search engines, caches and frames.
 */
export function proxy(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  const res = NextResponse.next({ request: { headers } });
  const p = req.nextUrl.pathname;
  if (p === "/admin" || p.startsWith("/admin/") || p.startsWith("/preview/") || p.startsWith("/api/admin")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
    res.headers.set("Referrer-Policy", "no-referrer");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|fonts/|icons/|favicon.ico|manifest.webmanifest).*)"],
};
