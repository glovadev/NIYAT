import { NextRequest } from "next/server";
import { calculateCartQuote } from "@/lib/checkout/pricing";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const checkoutValidateSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "At least one item is required in the cart"),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["RAZORPAY", "COD"]).default("RAZORPAY"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutValidateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid checkout payload",
        400
      );
    }

    const { items, couponCode, paymentMethod } = parsed.data;
    const quote = await calculateCartQuote(items, couponCode);

    return apiSuccess({
      ...quote,
      paymentMethod,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to calculate checkout quote";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
