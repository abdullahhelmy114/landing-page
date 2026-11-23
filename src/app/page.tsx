import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageView } from "@/components/shukraan/page/PageView";
import { loadPublic, pageMetadata } from "@/lib/cms/page.server";
import { readSite } from "@/lib/cms/store.server";

// The standard page in the default language. Content comes from the data volume, so every request
// reads the latest published version.
export const dynamic = "force-dynamic";

async function load() {
  const site = await readSite();
  return loadPublic(site.standardPage, site.defaultLanguage);
}

export async function generateMetadata(): Promise<Metadata> {
  const b = await load();
  return b ? pageMetadata(b) : {};
}

export default async function Home() {
  const b = await load();
  if (!b) notFound();
  return <PageView bundle={b} />;
}
