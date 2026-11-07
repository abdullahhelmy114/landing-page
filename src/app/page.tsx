import type { Metadata } from "next";

import { Landing } from "@/components/shukraan/Landing";
import { HOME_METADATA } from "@/lib/home-metadata";

export const metadata: Metadata = HOME_METADATA;

export default function Home() {
  return <Landing />;
}
