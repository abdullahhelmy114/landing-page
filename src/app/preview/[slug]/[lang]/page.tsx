import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PageView } from "@/components/shukraan/page/PageView";
import { SESSION_COOKIE, verifyPreview, verifySession } from "@/lib/cms/auth.server";
import { loadDraft } from "@/lib/cms/page.server";

// A page's draft, for a preview link (valid 7 days) or a logged-in session. Never indexed.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "معاينة المسودة", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string; lang: string }>; searchParams: Promise<{ t?: string }> };

export default async function Preview({ params, searchParams }: Props) {
  const { slug, lang } = await params;
  const { t } = await searchParams;
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifyPreview(slug, t)) && !(await verifySession(session))) notFound();
  const bundle = await loadDraft(slug, lang);
  if (!bundle) notFound();
  return (
    <>
      <div dir="rtl" lang="ar" className="preview-banner">
        معاينة المسودة — هذه النسخة غير منشورة بعد.
      </div>
      <PageView bundle={bundle} />
    </>
  );
}
