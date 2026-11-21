import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { checkCourierServiceability } from "@/lib/shiprocket";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const serviceabilityInputSchema = z.object({
  weightGrams: z.number().int().min(10, "Weight must be at least 10 grams").max(50000, "Weight cannot exceed 50 kg"),
  lengthCm: z.number().min(0.5).max(200),
  breadthCm: z.number().min(0.5).max(200),
  heightCm: z.number().min(0.5).max(200),
  pickupPincode: z.string().regex(/^\d{6}$/).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { orderId } = await params;
    const body = await req.json();

    const parsed = serviceabilityInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid parcel input", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return apiError("NOT_FOUND", "Order not found", 404);
    }

    // Persist validated parcel specifications to the order's shipment so they are saved across page refreshes
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        "shipment.parcel": {
          weightGrams: parsed.data.weightGrams,
          lengthCm: parsed.data.lengthCm,
          breadthCm: parsed.data.breadthCm,
          heightCm: parsed.data.heightCm,
        },
      },
    });

    const result = await checkCourierServiceability({
      pickupPincode: parsed.data.pickupPincode,
      deliveryPincode: order.shippingAddress.postalCode,
      weightGrams: parsed.data.weightGrams,
      cod: order.paymentMethod === "COD",
    });

    return apiSuccess(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Serviceability query failed";
    return apiError("SERVICEABILITY_ERROR", msg, 400);
  }
}

