export type Gender = "Kadın" | "Erkek";
export type CourseType = "regular" | "intensive";

/**
 * A group's WhatsApp invite as the save API returns it: the link, its QR code (with the group's
 * logo) as a PNG data URL drawn at 2x, and the width in CSS pixels to show it at.
 */
export type WhatsAppInvite = { url: string; qr: string; width: number };

/**
 * The WhatsApp group a buyer joins after payment: one per course and group type (the academy sets
 * each person's level after payment). `id` is saved with the registration, Yoğun (+) ending in
 * "+"; `file` names the group's link and QR files in whatsapp-gruplari/.
 */
export type WhatsAppGroup = { id: string; file: string; name: string; course: CourseType; gender: Gender };

export const WHATSAPP_GROUPS: WhatsAppGroup[] = [
  { id: "Kadın", file: "normal-kadin", name: "Normal · Kadın", course: "regular", gender: "Kadın" },
  { id: "Erkek", file: "normal-erkek", name: "Normal · Erkek", course: "regular", gender: "Erkek" },
  { id: "Kadın+", file: "yogun-kadin", name: "Yoğun (+) · Kadın", course: "intensive", gender: "Kadın" },
  { id: "Erkek+", file: "yogun-erkek", name: "Yoğun (+) · Erkek", course: "intensive", gender: "Erkek" },
];

/** The WhatsApp group for a course and group type. */
export const whatsappGroupFor = (course: CourseType, gender: Gender | "") =>
  WHATSAPP_GROUPS.find((g) => g.course === course && g.gender === gender);

/** The saved group id for a course and group type ("" until the type is chosen). */
export const groupIdFor = (course: CourseType, gender: Gender | "") => whatsappGroupFor(course, gender)?.id ?? "";

export type Price = { perLesson: number; lessons: number; total: number };

/**
 * Regular prices, charged without a discount code (they match WHOP_PLANS). A valid code's
 * discounted prices come from the server with its plans (see src/lib/discount.ts).
 */
export const PRICE: Price = { perLesson: 375, lessons: 16, total: 6000 };

export const REGULAR_PRICE: Price = { perLesson: 400, lessons: 8, total: 3200 };

/** An amount in Turkish style: 3200 → "3.200". */
export const formatTL = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const priceFor = (course: CourseType) => course === "regular" ? REGULAR_PRICE : PRICE;
export const courseTitle = (course: CourseType) => course === "regular" ? "Normal Konuşma Kursu" : "Yoğun Konuşma Kursu (+)";
