"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { SOCIAL_GLYPHS } from "./social-icons";

const MESSAGE = "Merhaba, Arapça konuşma kursu hakkında bir sorum var.";
export const WHATSAPP_FLOAT_HREF = `https://wa.me/905518550135?text=${encodeURIComponent(MESSAGE)}`;

/** Anything a visitor can press: the button steps aside rather than cover one. */
const PRESSABLE = "a[href],button,input,select,textarea,summary,label,iframe,[role=button],[role=link],[tabindex]:not([tabindex='-1'])";

/** Whether any visible, pressable element overlaps the given box (a full rectangle test). */
function coversPressable(box: DOMRect, own: Element) {
  const m = 2; // a small margin, so nothing pressable even touches the button
  for (const el of document.querySelectorAll<HTMLElement>(PRESSABLE)) {
    if (own.contains(el) || el.closest("[hidden]")) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.right < box.left - m || r.left > box.right + m || r.bottom < box.top - m || r.top > box.bottom + m) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.pointerEvents === "none" || cs.display === "none") continue;
    return true;
  }
  return false;
}

/** Whether the payment step's Whop checkout is on screen. */
function checkoutOnScreen() {
  const box = document.querySelector("[data-checkout-area]")?.getBoundingClientRect();
  return !!box && box.height > 0 && box.top < window.innerHeight && box.bottom > 0;
}

/**
 * The round WhatsApp button fixed at the bottom-right corner of every page. It stays above the
 * mobile «Kayıt ol» bar, fades out while it would cover anything pressable (and, on phones, while
 * the Whop checkout is on screen), and on desktop shows a small label on hover, on focus and once
 * after 8 seconds.
 */
export function WhatsAppFloat() {
  const ref = useRef<HTMLAnchorElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const [aside, setAside] = useState(false);
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setNudge(true), 8_000);
    const hide = setTimeout(() => setNudge(false), 12_000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  // The once-only label never lands on something pressable: if it would, it stays hidden.
  useEffect(() => {
    if (!nudge) return;
    const raf = requestAnimationFrame(() => {
      const el = ref.current;
      const lab = label.current;
      if (el && lab && getComputedStyle(lab).display !== "none" && coversPressable(lab.getBoundingClientRect(), el)) setNudge(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [nudge]);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const phone = window.innerWidth < 768;
      setAside((phone && checkoutOnScreen()) || coversPressable(el.getBoundingClientRect(), el));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "open"] });
    const cta = new MutationObserver(schedule);
    cta.observe(document.documentElement, { attributes: true, attributeFilter: ["data-cta-bar"] });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      mo.disconnect();
      cta.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <a
      ref={ref}
      href={WHATSAPP_FLOAT_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp'tan bize yaz"
      data-aside={aside ? "true" : undefined}
      data-nudge={nudge ? "true" : undefined}
      onClick={() => track("whatsapp_float_click")}
      className="wa-float"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="wa-float-glyph">
        <path d={SOCIAL_GLYPHS.whatsapp} />
      </svg>
      <span ref={label} aria-hidden="true" className="wa-float-label">
        Soru ya da sorun mu? Bize yaz
      </span>
    </a>
  );
}
