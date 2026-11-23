import { headers } from "next/headers";
import Link from "next/link";

import { WhatsAppFloat } from "@/components/shukraan/WhatsAppFloat";
import { whatsappHref } from "@/lib/whatsapp-link";
import { makeT } from "@/lib/cms/i18n";
import { languageForPath, loadPublic, pageHref } from "@/lib/cms/page.server";

/** A missing page, in the language of its path, with the floating WhatsApp button. */
export default async function NotFound() {
  const path = (await headers()).get("x-pathname") ?? "/";
  const { site, code } = await languageForPath(path);
  const lang = site.languages.some((l) => l.code === code) ? code : site.defaultLanguage;
  const b = await loadPublic(site.standardPage, lang);
  const t = makeT(b?.content.ui ?? {}, b?.fallbackUi ?? {});
  const wa = b?.settings.whatsapp;
  const text = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <h2 className="mt-4 text-xl font-semibold text-foreground">{text("notFound.title", "Page not found")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{text("notFound.text", "The page you're looking for doesn't exist or has moved.")}</p>
          <div className="mt-6">
            <Link
              href={pageHref(site, site.standardPage, lang)}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {text("notFound.home", "Go home")}
            </Link>
          </div>
        </div>
      </div>
      {wa?.number && <WhatsAppFloat href={whatsappHref(wa.number, wa.message[lang] ?? "")} ariaLabel={t("float.aria")} label={t("float.label")} />}
    </>
  );
}
