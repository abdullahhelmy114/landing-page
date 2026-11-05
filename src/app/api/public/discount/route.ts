import { findDiscount } from "@/lib/discount-codes.server";

/** Checks a discount code; returns the discounted plans only when the code is accepted. */
export async function POST(request: Request) {
  let code: unknown;
  try {
    code = ((await request.json()) as { code?: unknown } | null)?.code;
  } catch {
    code = undefined;
  }
  const discount = findDiscount(code);
  return Response.json(discount ? { ok: true, discount } : { ok: false }, {
    headers: { "Cache-Control": "no-store" },
  });
}
