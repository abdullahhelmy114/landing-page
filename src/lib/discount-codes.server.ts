import "server-only";

import type { Discount, DiscountPlans } from "@/lib/discount";

/**
 * Accepted discount codes and the discounted Whop plans each one opens. Change or add codes here;
 * a code is matched in any letter case, ignoring surrounding spaces. This file is imported only by
 * /api/public/discount, so neither the codes nor these plan ids reach the page's JavaScript.
 */
const CODES: Record<string, DiscountPlans> = {
  DAD40: {
    regular: { planId: "plan_StYGYpVC4Ogk9", perLesson: 250, total: 2000 },
    intensive: { planId: "plan_x7Gp7I9pNF2iX", perLesson: 225, total: 3600 },
  },

  KONUSMA40: {
    regular: { planId: "plan_StYGYpVC4Ogk9", perLesson: 250, total: 2000 },
    intensive: { planId: "plan_x7Gp7I9pNF2iX", perLesson: 225, total: 3600 },
  },
};


const normalize = (code: string) => code.trim().toUpperCase();

const BY_CODE = new Map(Object.entries(CODES).map(([code, plans]) => [normalize(code), plans]));

/** The discount a code opens, or null if the code is not accepted. */
export function findDiscount(input: unknown): Discount | null {
  if (typeof input !== "string") return null;
  const code = normalize(input);
  const plans = BY_CODE.get(code);
  return plans ? { code, plans } : null;
}
