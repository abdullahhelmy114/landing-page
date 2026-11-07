import "server-only";

import type { Discount, DiscountPlans } from "@/lib/discount";

/**
 * Accepted discount codes and the discounted Whop plans each one opens. Change or add codes here;
 * a code is matched in any letter case, ignoring surrounding spaces. This file is imported only on
 * the server, so neither the codes nor these plan ids reach the page's JavaScript.
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

/**
 * Referral links: opening /<path> shows the page with that path's code already applied (it stays
 * applied through payment). Paths are matched in any letter case.
 */
const REFERRAL_PATHS: Record<string, string> = {
  konusma40: "KONUSMA40",
  dad40: "DAD40",
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

/** The discount a referral path opens, or null if the path is not a referral link. */
export function findReferral(path: unknown): Discount | null {
  if (typeof path !== "string") return null;
  const code = REFERRAL_PATHS[path.trim().toLowerCase()];
  return code ? findDiscount(code) : null;
}
