import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { createShiprocketOrder } from "@/lib/shiprocket";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createShipmentSchema = z.object({
  parcel: z
    .object({
      weightGrams: z.number().int().min(10, "Weight must be at least 10 grams").max(50000, "Weight cannot exceed 50 kg"),
      lengthCm: z.number().min(0.5).max(200),
      breadthCm: z.number().min(0.5).max(200),
      heightCm: z.number().min(0.5).max(200),
    })
    .optional(),
  pickupLocation: z.string().optional(),
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
    const body = await req.json().catch(() => ({}));

    const parsed = createShipmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid parcel dimensions", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return apiError("NOT_FOUND", "Order not found", 404);
    }

    // Use passed parcel or fall back to persisted parcel specifications
    const parcelSpecs = parsed.data.parcel || order.shipment?.parcel;
    if (!parcelSpecs) {
      return apiError(
        "VALIDATION_ERROR",
        "Parcel specifications (weight in grams, dimensions in cm) are required to create a shipment",
        400
      );
    }

    const updatedOrder = await createShiprocketOrder(
      orderId,
      parcelSpecs,
      parsed.data.pickupLocation
    );

    return apiSuccess({
      orderNumber: updatedOrder.orderNumber,
      shipment: updatedOrder.shipment,
      message: updatedOrder.shipment?.shipmentState === "ORDER_CREATED"
        ? "Order created successfully in Shiprocket"
        : "Order creation initiated but requires reconciliation",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create shipment in Shiprocket";
    return apiError("SHIPMENT_CREATION_FAILED", msg, 400);
  }
}

