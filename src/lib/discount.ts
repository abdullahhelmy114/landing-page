import type { CourseType } from "@/components/shukraan/data";

/** One course's discounted Whop plan and the prices it charges. */
export type DiscountPlan = { planId: string; perLesson: number; total: number };
export type DiscountPlans = Record<CourseType, DiscountPlan>;

/** A discount code the server accepted, with the discounted plans it opens. */
export type Discount = { code: string; plans: DiscountPlans };

export const DISCOUNT_ENDPOINT = "/api/public/discount";

const isPlan = (v: unknown): v is DiscountPlan => {
  const p = v as Partial<DiscountPlan> | null;
  return (
    typeof p === "object" &&
    p !== null &&
    typeof p.planId === "string" &&
    typeof p.perLesson === "number" &&
    typeof p.total === "number"
  );
};

/** Whether a value (a route response or session storage) is a well-formed Discount. */
export const isDiscount = (v: unknown): v is Discount => {
  const d = v as Partial<Discount> | null;
  return (
    typeof d === "object" &&
    d !== null &&
    typeof d.code === "string" &&
    isPlan(d.plans?.regular) &&
    isPlan(d.plans?.intensive)
  );
};

/**
 * Asks the server whether a code (or a referral link's path) is accepted. Resolves to the Discount
 * when it is, `null` when it is not, and `"error"` when the server could not be reached.
 */
export async function checkDiscountCode(input: { code: string } | { ref: string }): Promise<Discount | null | "error"> {
  if (!("code" in input ? input.code : input.ref).trim()) return null;
  try {
    const res = await fetch(DISCOUNT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    if (!res.ok) return "error";
    const body = (await res.json()) as { ok?: boolean; discount?: unknown };
    return body.ok && isDiscount(body.discount) ? body.discount : null;
  } catch {
    return "error";
  }
}
