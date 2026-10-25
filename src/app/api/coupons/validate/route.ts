import { NextRequest } from "next/server";
import { calculateCartQuote } from "@/lib/checkout/pricing";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const couponValidateSchema = z.object({
  code: z.string().min(1, "Coupon code is required").max(30),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = couponValidateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid input",
        400
      );
    }

    const { code, items } = parsed.data;
    const quote = await calculateCartQuote(items, code);

    if (quote.appliedCoupon && quote.appliedCoupon.discountPaise > 0) {
      return apiSuccess({
        valid: true,
        code: quote.appliedCoupon.code,
        discountPaise: quote.appliedCoupon.discountPaise,
        message: "Coupon applied successfully",
      });
    }

    return apiSuccess({
      valid: false,
      code: code.trim().toUpperCase(),
      discountPaise: 0,
      message: quote.couponError || "Coupon is not applicable to current cart items",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to validate coupon";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
