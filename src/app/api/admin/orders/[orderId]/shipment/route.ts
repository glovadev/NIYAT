import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateShipmentParcelSchema = z.object({
  parcel: z.object({
    weightGrams: z.number().int().min(10, "Weight must be at least 10 grams").max(50000, "Weight cannot exceed 50 kg"),
    lengthCm: z.number().min(0.5).max(200),
    breadthCm: z.number().min(0.5).max(200),
    heightCm: z.number().min(0.5).max(200),
  }),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { orderId } = await params;

    const order = await Order.findById(orderId);
    if (!order) {
      return apiError("NOT_FOUND", "Order not found", 404);
    }

    return apiSuccess({
      orderNumber: order.orderNumber,
      fulfilmentStatus: order.fulfilmentStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      totalPaise: order.totalPaise,
      shippingAddress: order.shippingAddress,
      shipment: order.shipment || {
        shipmentState: "IDLE",
        trackingActivities: [],
        requiresReview: false,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch shipment details";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { orderId } = await params;
    const body = await req.json();

    const parsed = updateShipmentParcelSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid parcel input", 400);
    }

    const updated = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          "shipment.parcel": parsed.data.parcel,
        },
      },
      { new: true }
    );

    if (!updated) {
      return apiError("NOT_FOUND", "Order not found", 404);
    }

    return apiSuccess({
      orderNumber: updated.orderNumber,
      parcel: updated.shipment?.parcel,
      message: "Parcel specifications saved successfully",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to save parcel specifications";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}


