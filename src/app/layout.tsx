import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import type { ReactNode } from "react";

import { languageForPath } from "@/lib/cms/page.server";
import "../styles.css";

// Umami (cookieless visitor analytics): loads only in a production build with a website id set,
// and never on the control panel or preview links.
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const UMAMI_SRC = process.env.NEXT_PUBLIC_UMAMI_SRC || "https://cloud.umami.is/script.js";
const UMAMI_ON = Boolean(UMAMI_WEBSITE_ID) && process.env.NODE_ENV === "production";

const NAME_TR = "ŞukraanEdu Akademisi | أَكاديمِيَّةُ شُكْران إِيدْيُو";

export const metadata: Metadata = {
  title: NAME_TR,
  description: "Dr. Jehan Ziyad ile Arapça konuşma pratiği · ŞukraanEdu Akademisi",
  authors: [{ name: "Dr. Jehan Ziyad" }],
  openGraph: {
    title: NAME_TR,
    description: "Arapça konuşma pratiği · ŞukraanEdu Akademisi",
    type: "website",
  },
  twitter: { card: "summary_large_image", site: "@Lovable" },
  // The emblem from shukraan-emblem-files.zip.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/";
  const { code, dir } = await languageForPath(path);
  const panel = path === "/admin" || path.startsWith("/admin/") || path.startsWith("/preview/");
  return (
    <html lang={code} dir={dir} suppressHydrationWarning>
      <head>
        {/* Amiri (Arabic) and Carlito (Latin) are self-hosted in /fonts (OFL); see src/styles.css. */}
        <link rel="preload" href="/fonts/carlito-latin-400-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/amiri-arabic-400-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        {UMAMI_ON && !panel && (
          // Query strings (e.g. Whop's payment id on return) and hashes are never sent.
          <Script
            src={UMAMI_SRC}
            data-website-id={UMAMI_WEBSITE_ID}
            data-exclude-search="true"
            data-exclude-hash="true"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
