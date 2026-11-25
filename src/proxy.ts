import { NextResponse, type NextRequest } from "next/server";

import { isProbe, PROBE_RESPONSE_INIT } from "@/lib/probes";

/**
 * Passes the request path to the root layout (for <html lang dir>), and answers scanners' probes
 * (/.env, /.git/HEAD, /backup.sql …) with a plain 404 before any page runs. The control panel,
 * preview links and the panel's API are kept out of search engines, caches and frames (also set in
 * next.config.ts, for hosts where the proxy does not run).
 */
export function proxy(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (isProbe(p)) return new NextResponse("Not found", PROBE_RESPONSE_INIT);
  const headers = new Headers(req.headers);
  headers.set("x-pathname", p);
  const res = NextResponse.next({ request: { headers } });
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
