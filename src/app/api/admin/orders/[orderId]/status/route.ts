import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateStatusSchema = z.object({
  status: z
    .enum([
      "PENDING_PAYMENT",
      "CONFIRMED",
      "PROCESSING",
      "PACKED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLATION_REQUESTED",
      "CANCELLED",
      "RETURN_REQUESTED",
      "RETURNED",
    ])
    .optional(),
  paymentStatus: z
    .enum([
      "CREATED",
      "PENDING",
      "AUTHORIZED",
      "PAID",
      "FAILED",
      "CANCELLED",
      "REFUND_PENDING",
      "PARTIALLY_REFUNDED",
      "REFUNDED",
    ])
    .optional(),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional().nullable(),
  note: z.string().optional(),
});

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

    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid status payload",
        400
      );
    }

    if (!parsed.data.status && !parsed.data.paymentStatus) {
      return apiError(
        "VALIDATION_ERROR",
        "Either 'status' (fulfilment) or 'paymentStatus' must be provided",
        400
      );
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return apiError("NOT_FOUND", "Order not found", 404);
    }

    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    // 1. Update Fulfilment Status
    if (parsed.data.status) {
      const previousStatus = order.fulfilmentStatus;
      const nextStatus = parsed.data.status;
      order.fulfilmentStatus = nextStatus;

      // If shipping info provided
      if (parsed.data.carrier || parsed.data.trackingNumber || parsed.data.trackingUrl) {
        order.shipment = {
          carrier: parsed.data.carrier || order.shipment?.carrier,
          trackingNumber: parsed.data.trackingNumber || order.shipment?.trackingNumber,
          trackingUrl: parsed.data.trackingUrl || order.shipment?.trackingUrl,
          shippedAt: nextStatus === "SHIPPED" ? new Date() : order.shipment?.shippedAt,
          deliveredAt: nextStatus === "DELIVERED" ? new Date() : order.shipment?.deliveredAt,
        };
      }

      order.statusHistory.push({
        type: "FULFILMENT",
        from: previousStatus,
        to: nextStatus,
        actorType: "ADMIN",
        actorId: String(adminCheck.context?.profile._id),
        reason: parsed.data.note || `Status transitioned to ${nextStatus}`,
        at: new Date(),
      });
    }

    // 2. Update Payment Status (optional)
    if (parsed.data.paymentStatus) {
      const prevPayment = order.paymentStatus;
      order.paymentStatus = parsed.data.paymentStatus;

      order.statusHistory.push({
        type: "PAYMENT",
        from: prevPayment,
        to: parsed.data.paymentStatus,
        actorType: "ADMIN",
        actorId: String(adminCheck.context?.profile._id),
        reason: parsed.data.note || `Payment marked as ${parsed.data.paymentStatus}`,
        at: new Date(),
      });
    }

    await order.save();

    return apiSuccess({
      orderNumber: order.orderNumber,
      fulfilmentStatus: order.fulfilmentStatus,
      paymentStatus: order.paymentStatus,
      shipment: order.shipment,
      message: `Order status updated successfully`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update order status";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
