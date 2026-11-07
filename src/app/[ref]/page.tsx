import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Landing } from "@/components/shukraan/Landing";
import { findReferral } from "@/lib/discount-codes.server";
import { HOME_METADATA } from "@/lib/home-metadata";

// A referral link (/konusma40, /dad40 …): the landing page with that link's code applied. Any
// other single-segment path is a 404. Referral pages stay out of search results.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { ...HOME_METADATA, robots: { index: false, follow: true } };

export default async function ReferralPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!findReferral(ref)) notFound();
  return <Landing referral={ref.toLowerCase()} />;
}
