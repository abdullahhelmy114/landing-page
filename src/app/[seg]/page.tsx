import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { PageView } from "@/components/shukraan/page/PageView";
import { loadPublic, pageMetadata } from "@/lib/cms/page.server";
import { resolveRoute } from "@/lib/cms/route.server";

// /en, /ar …: the standard page in that language. /dad40, /konusma40: a referral link (the
// standard page with its code applied, kept out of search results). /<slug>: a course page.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ seg: string }> };

async function load(params: Props["params"]) {
  const { seg } = await params;
  const route = await resolveRoute([seg]);
  if (route.kind === "redirect") permanentRedirect(route.to);
  if (route.kind === "none") return null;
  const bundle = await loadPublic(route.slug, route.lang, route.referral);
  return bundle ? { bundle, referral: route.referral } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await load(params);
  return r ? pageMetadata(r.bundle, { noindex: !!r.referral }) : {};
}

export default async function Page({ params }: Props) {
  const r = await load(params);
  if (!r) notFound();
  return <PageView bundle={r.bundle} {...(r.referral ? { referral: r.referral } : {})} />;
}
