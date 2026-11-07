import { findDiscount, findReferral } from "@/lib/discount-codes.server";

/**
 * Checks a discount code (`code`) or a referral link's path (`ref`); returns the discounted plans
 * only when it is accepted.
 */
export async function POST(request: Request) {
  let body: { code?: unknown; ref?: unknown } | null = null;
  try {
    body = (await request.json()) as { code?: unknown; ref?: unknown } | null;
  } catch {
    body = null;
  }
  const discount = body?.ref !== undefined ? findReferral(body.ref) : findDiscount(body?.code);
  return Response.json(discount ? { ok: true, discount } : { ok: false }, {
    headers: { "Cache-Control": "no-store" },
  });
}
