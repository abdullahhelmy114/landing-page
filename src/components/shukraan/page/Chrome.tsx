"use client";

import { track } from "@/lib/analytics";
import { resolveScheme, SCHEMES } from "@/lib/cms/lockup";
import { SOCIAL_GLYPHS } from "../social-icons";
import { go, usePage } from "./context";
import { Btn, Item, Txt } from "./Editable";
import { Lockup } from "./Lockup";

/** The language switcher: this page in every language of the site. */
function LangSwitch() {
  const { links, lang, t } = usePage();
  if (links.length < 2) return null;
  return (
    <nav aria-label={t("lang.label")} className="lang-switch">
      {links.map((l) => (
        <a key={l.code} href={l.href} hrefLang={l.code} lang={l.code} aria-current={l.code === lang ? "page" : undefined}>
          {l.label}
        </a>
      ))}
    </nav>
  );
}

/**
 * The header band: the full lockup, the section links, the language switcher and the sign-up
 * button. It scrolls with the page; a thin gold bar fixed at the top shows reading progress.
 */
export function Header() {
  const { site, lang, settings, content, t, edit } = usePage();
  const scheme = resolveScheme(settings.lockup.header);
  const { bg, fg } = SCHEMES[scheme];
  const h = content.header;
  const lockup = <Lockup site={site} lang={lang} scheme={scheme} alt={t("lockup.alt")} as="span" />;
  return (
    <header className="band relative z-40" data-scheme={scheme} style={{ background: bg, color: fg }}>
      <div aria-hidden className="scroll-progress gradient-gold" />
      {edit && (
        <button type="button" dir="rtl" lang="ar" className="cms-fields-btn" onClick={() => edit.openFields("header")}>
          روابط الترويسة
        </button>
      )}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-4 py-5 sm:px-8">
        {edit ? (
          <div className="min-w-0 flex-[1_1_28rem]">{lockup}</div>
        ) : (
          <a href="#top" className="lockup-link min-w-0 flex-[1_1_28rem]">
            {lockup}
          </a>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <nav className="hidden items-center gap-1 lg:flex">
            {h.nav.map((n, i) => (
              <Item key={n.id} list={["header", "nav"]} id={n.id} index={i} count={h.nav.length} as="span">
                {edit ? (
                  <Txt path={["header", "nav", `#${n.id}`, "label"]} value={n.label} className="band-link" />
                ) : (
                  <button type="button" onClick={() => go(n.target)} className="band-link">
                    {n.label}
                  </button>
                )}
              </Item>
            ))}
          </nav>
          {!edit && <LangSwitch />}
          <Btn path={["header", "cta"]} value={h.cta} className="band-cta" />
        </div>
      </div>
    </header>
  );
}

/** The footer band: the lockup, the contact sentence and the academy's accounts as icon links. */
export function Footer() {
  const { site, lang, settings, content, t, edit } = usePage();
  const scheme = resolveScheme(settings.lockup.footer);
  const { bg, fg } = SCHEMES[scheme];
  const f = content.footer;
  return (
    <footer
      id="iletisim"
      data-scheme={scheme}
      // Extra room at the bottom so nothing in the footer ever sits under the floating WhatsApp button.
      style={{ background: bg, color: fg, paddingBottom: "calc(88px + env(safe-area-inset-bottom))" }}
      className="band relative px-4 pt-12 sm:px-8"
    >
      {edit && (
        <button type="button" dir="rtl" lang="ar" className="cms-fields-btn" onClick={() => edit.openFields("footer")}>
          روابط التذييل
        </button>
      )}
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Lockup site={site} lang={lang} scheme={scheme} alt={t("lockup.alt")} className="lockup-center" />
        <Txt as="p" path={["footer", "contact"]} value={f.contact} className="mt-8 max-w-xl text-sm leading-relaxed" multiline />
        <ul className="mt-5 flex justify-center gap-2">
          {f.social.map((s, i) => {
            const glyph = SOCIAL_GLYPHS[s.id as keyof typeof SOCIAL_GLYPHS];
            const icon = glyph ? (
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-5 w-5 fill-current">
                <path d={glyph} />
              </svg>
            ) : (
              <span className="text-xs font-semibold">{s.label}</span>
            );
            return (
              <Item key={s.id} list={["footer", "social"]} id={s.id} index={i} count={f.social.length} as="li">
                {edit ? (
                  <span className="band-icon" title={s.label}>
                    {icon}
                  </span>
                ) : (
                  s.href && (
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      onClick={s.id === "whatsapp" ? () => track("whatsapp_footer_click") : undefined}
                      className="band-icon"
                    >
                      {icon}
                    </a>
                  )
                )}
              </Item>
            );
          })}
        </ul>
      </div>
    </footer>
  );
}
