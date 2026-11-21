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
      const nextStatus = parsed.data.status;
      const isAdvancingToTransit = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(nextStatus);

      // Safety Guard: Manual controls cannot bypass emergency review or shipment state restrictions
      if (isAdvancingToTransit) {
        if (
          order.shipment?.requiresReview ||
          order.shipment?.shipmentState === "REASSIGNMENT_BLOCKED" ||
          order.shipment?.shipmentState === "RECONCILIATION_REQUIRED"
        ) {
          return apiError(
            "TRANSITION_BLOCKED",
            `Manual transition to ${nextStatus} blocked: Order has an unresolved shipment review or lock (${order.shipment?.shipmentState || "REVIEW_REQUIRED"}). Reconcile or resolve emergency override first.`,
            400
          );
        }
      }

      const previousStatus = order.fulfilmentStatus;
      order.fulfilmentStatus = nextStatus;

      // Preserve existing shipment object structure (parcel, shipmentState, awbCode, etc.)
      if (!order.shipment) {
        order.shipment = {} as any;
      }
      const shipment = order.shipment!;

      if (parsed.data.carrier) shipment.carrier = parsed.data.carrier;
      if (parsed.data.trackingNumber) shipment.trackingNumber = parsed.data.trackingNumber;
      if (parsed.data.trackingUrl !== undefined) shipment.trackingUrl = parsed.data.trackingUrl || undefined;
      if (nextStatus === "SHIPPED" && !shipment.shippedAt) shipment.shippedAt = new Date();
      if (nextStatus === "DELIVERED" && !shipment.deliveredAt) shipment.deliveredAt = new Date();

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
