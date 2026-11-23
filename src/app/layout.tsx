import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { WhatsAppFloat } from "@/components/shukraan/WhatsAppFloat";
import "../styles.css";

// Umami (cookieless visitor analytics): loads only in a production build with a website id set.
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const UMAMI_SRC = process.env.NEXT_PUBLIC_UMAMI_SRC || "https://cloud.umami.is/script.js";
const UMAMI_ON = Boolean(UMAMI_WEBSITE_ID) && process.env.NODE_ENV === "production";

export const metadata: Metadata = {
  title: "Shukraan Akademi",
  description: "Dr. Jehan Ali Ziyad ile Arapça konuşma pratiği.",
  authors: [{ name: "Dr. Jehan Ziyad" }],
  openGraph: {
    title: "Shukraan Akademi",
    description: "Arapça konuşma pratiği · Shukraan Akademi",
    type: "website",
  },
  twitter: { card: "summary_large_image", site: "@Lovable" },
  icons: { icon: [{ url: "/favicon.ico", type: "image/x-icon" }] },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The root layout wraps every route, so these fonts load site-wide. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Inter:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body>
        {children}
        <WhatsAppFloat />
        {UMAMI_ON && (
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
