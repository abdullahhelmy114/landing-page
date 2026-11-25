import type { CourseType } from "@/components/shukraan/data";

/**
 * Whop plans sold on the page without a discount code, one per course. Plan IDs are public
 * identifiers, not secrets; the plan itself sets the price that is charged, so keep `priceTRY` in
 * step with Whop. The discounted plans stay on the server (src/lib/discount-codes.server.ts).
 */
export const WHOP_PLANS: Record<CourseType, { planId: string; priceTRY: number }> = {
  regular: { planId: "plan_sqQS6VEgQIcDO", priceTRY: 3200 },
  intensive: { planId: "plan_HA1YTgDwZKh1I", priceTRY: 6000 },
};
