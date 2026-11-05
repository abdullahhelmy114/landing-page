import type { CourseType } from "@/components/shukraan/data";

/**
 * Whop plans sold on the page, one per course. Plan IDs are public identifiers, not secrets;
 * the plan itself sets the price that is charged, so keep `priceTRY` in step with Whop.
 */
export const WHOP_PLANS: Record<CourseType, { planId: string; priceTRY: number }> = {
  regular: { planId: "plan_StYGYpVC4Ogk9", priceTRY: 2000 },
  intensive: { planId: "plan_x7Gp7I9pNF2iX", priceTRY: 3600 },
};
