import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { Editor } from "@/components/admin/Editor";
import { SESSION_COOKIE, verifySession } from "@/lib/cms/auth.server";
import { hasUnpublished, listVersions, readDraft, readSite, readTrash } from "@/lib/cms/store.server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تحرير الصفحة", robots: { index: false, follow: false } };

export default async function EditPage({ params }: { params: Promise<{ slug: string; lang: string }> }) {
  if (!verifySession((await cookies()).get(SESSION_COOKIE)?.value)) redirect("/admin");
  const { slug, lang } = await params;
  const site = await readSite();
  if (!site.languages.some((l) => l.code === lang)) notFound();
  const draft = await readDraft(slug, site);
  if (!draft) notFound();
  const [trash, versions, unpublished] = await Promise.all([readTrash(slug), listVersions(slug), hasUnpublished(slug)]);
  return <Editor key={`${slug}/${lang}`} slug={slug} lang={lang} initial={{ site, ...draft, trash, versions, unpublished }} />;
}
