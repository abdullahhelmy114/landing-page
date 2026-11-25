import type { Metadata } from "next";
import { cookies } from "next/headers";

import { Dashboard } from "@/components/admin/Dashboard";
import { Login } from "@/components/admin/Login";
import { loginConfigured, SESSION_COOKIE, verifySession } from "@/lib/cms/auth.server";
import { hasUnpublished, listPages, readSite } from "@/lib/cms/store.server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "لوحة التحكم", robots: { index: false, follow: false } };

export default async function AdminHome() {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(session))) return <Login configured={loginConfigured()} />;
  const [site, pages] = await Promise.all([readSite(), listPages()]);
  const rows = await Promise.all(pages.map(async (p) => ({ ...p, unpublished: await hasUnpublished(p.slug) })));
  return <Dashboard initialPages={rows} initialSite={site} />;
}
