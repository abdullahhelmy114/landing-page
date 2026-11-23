import type { Section, SectionType } from "./types";

/** Section types the panel can add, with their Arabic names. */
export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "الواجهة الرئيسية",
  features: "المزايا",
  timetable: "المواعيد والمجموعات",
  pricing: "الأسعار",
  payment: "السعر والدفع (Whop)",
  faq: "الأسئلة الشائعة",
  testimonials: "آراء المتعلّمين",
  cta: "دعوة للتسجيل",
  whatsapp: "واتساب",
  richtext: "نص حر مع صورة",
  phrases: "عبارات عربية",
  program: "عن الدورة",
  steps: "خطوات البرنامج",
  instructor: "المعلّمة",
};

const PH: Record<string, { title: string; text: string; button: string; item: string }> = {
  tr: { title: "Yeni başlık", text: "Buraya metni yaz.", button: "Kayıt ol ↗", item: "Yeni madde" },
  en: { title: "New heading", text: "Write the text here.", button: "Register ↗", item: "New item" },
  ar: { title: "عنوان جديد", text: "اكتب النص هنا.", button: "سجّل الآن ↖", item: "عنصر جديد" },
};
const ph = (lang: string) => PH[lang] ?? PH["en"]!;

export const newId = (prefix = "s") => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

/** Default fields for a new section of this type, in one language (ids are shared by all languages). */
export function defaultFields(type: SectionType, lang: string, ids: string[]): Record<string, unknown> {
  const p = ph(lang);
  const [a = "i1", b = "i2", c = "i3"] = ids;
  switch (type) {
    case "hero":
      return { badges: [], arabicLine: "", title: p.title, titleAccent: "", bodyHtml: p.text, primary: { label: p.button, target: "basvuru" }, secondary: { label: "", target: "" }, note: "", image: { src: "/images/classroom.jpg", alt: "" } };
    case "features":
      return { eyebrow: "", title: p.title, intro: p.text, items: [a, b, c].map((id) => ({ id, title: p.item, body: p.text })) };
    case "timetable":
      return { eyebrow: "", title: p.title, intro: "", rows: [{ id: a, plan: p.item, group: "", days: "", time: "" }], noteHtml: "" };
    case "pricing":
      return { eyebrow: "", title: p.title, titleAccent: "", intro: "", discountNote: "", showDiscount: false, cards: [{ id: a, course: "", title: p.item, price: "", total: "", meta: "", live: "", button: p.button }] };
    case "payment":
      return { eyebrow: "", title: p.title, titleAccent: "" };
    case "faq":
      return { eyebrow: "", title: p.title, items: [{ id: a, q: p.title, aHtml: p.text }] };
    case "testimonials":
      return { eyebrow: "", title: p.title, items: [{ id: a, name: p.item, text: p.text, consent: false }] };
    case "cta":
      return { title: p.title, titleAccent: "", text: "", button: { label: p.button, target: "basvuru" } };
    case "whatsapp":
      return { title: p.title, text: p.text };
    case "richtext":
      return { title: p.title, bodyHtml: p.text, image: { src: "", alt: "" }, imageSide: "end" };
    case "phrases":
      return { eyebrow: p.title, items: [{ id: a, ar: "مرحبًا", level: "A2" }] };
    case "program":
      return { marquee: "", eyebrow: "", quote: p.title, introHtml: p.text, audienceHtml: "", activitiesTitle: "", activities: [{ id: a, text: p.item }] };
    case "steps":
      return { eyebrow: "", title: p.title, subtitle: "", items: [{ id: a, n: "01", title: p.item, body: p.text }] };
    case "instructor":
      return { eyebrow: "", name: p.title, role: "", title: "", areas: "", bioHtml: p.text, credentialsTitle: "", credentials: [{ id: a, text: p.item }], image: { src: "/images/jehan-cream-office.png", alt: "" } };
  }
}

/** A new, empty section with this type in one language. */
export function newSection(type: SectionType, lang: string, id: string, ids: string[]): Section {
  return { id, type, fields: defaultFields(type, lang, ids) };
}

/** The first text of a section, for lists in the panel. */
export function sectionTitle(s: Section): string {
  const f = s.fields as Record<string, unknown>;
  for (const k of ["title", "eyebrow", "name", "quote"]) {
    const v = f[k];
    if (typeof v === "string" && v.trim()) return v.replace(/<[^>]*>/g, "").slice(0, 60);
  }
  return "";
}
