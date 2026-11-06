import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Coolify Docker image (see Dockerfile).
  output: "standalone",
  // The WhatsApp group links and QR codes (read at runtime, never served) ship with the server.
  outputFileTracingIncludes: {
    "/api/public/shukraan-register": ["./whatsapp-gruplari/**/*"],
  },
};

export default nextConfig;
