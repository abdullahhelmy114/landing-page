import type { NextConfig } from "next";

const PANEL_HEADERS = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "no-store" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "no-referrer" },
];

// `bun run cf:build` sets CF_BUILD=1: the Worker build, which needs the WebAssembly image codecs
// (Workers cannot run sharp). The Docker build leaves them out.
const CF_BUILD = process.env["CF_BUILD"] === "1";

const nextConfig: NextConfig = {
  // Self-contained server bundle: the Docker image (Dockerfile) and, through OpenNext, the
  // Cloudflare Worker (wrangler.jsonc) are both built from it.
  output: "standalone",
  ...(CF_BUILD
    ? {
        turbopack: { resolveAlias: { "@/lib/cms/images/wasm-codec": "./src/lib/cms/images/wasm.server.ts" } },
        // Turbopack's WebAssembly loader traces broadly; keep build tools out of the server output.
        outputFileTracingExcludes: {
          "*": ["node_modules/wrangler/**", "node_modules/workerd/**", "node_modules/@cloudflare/**", "node_modules/miniflare/**", "node_modules/esbuild/**", "node_modules/@esbuild/**", "node_modules/typescript/**", "node_modules/@opennextjs/aws/**", ".open-next/**", ".wrangler/**", ".git/**", "node_modules/@next/swc-*/**"],
        },
      }
    : {
        // sharp is loaded with a dynamic import (images/convert.server.ts, so a Worker never loads
        // it), and the file tracer then finds its .node file but not the libvips libraries it
        // needs (@img/sharp-libvips-* on Linux, the DLLs beside it on Windows): ship them all.
        outputFileTracingIncludes: { "*": ["./node_modules/@img/**/*"] },
      }),
  // The control panel, preview links and the panel's API: never indexed, cached or framed (the proxy
  // sets the same; this also covers hosts where it does not run).
  async headers() {
    return [
      { source: "/admin", headers: PANEL_HEADERS },
      { source: "/admin/:path*", headers: PANEL_HEADERS },
      { source: "/preview/:path*", headers: PANEL_HEADERS },
      { source: "/api/admin/:path*", headers: PANEL_HEADERS },
    ];
  },
};

export default nextConfig;

// `next dev` with STORAGE=cloudflare: local D1/R2 bindings from wrangler.jsonc.
if (process.env["STORAGE"] === "cloudflare" && process.env["NODE_ENV"] !== "production") {
  void import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}
