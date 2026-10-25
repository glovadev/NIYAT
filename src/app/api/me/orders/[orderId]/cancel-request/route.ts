import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { Order } from "@/models/Order";
import { apiSuccess, apiError } from "@/lib/api/response";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return apiError("UNAUTHENTICATED", "Please log in to request cancellation", 401);
    }

    const { orderId } = await params;
    const body = await req.json();
    const reason = body?.reason?.trim() || "Customer requested cancellation";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId: auth.profile._id };
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      query.$or = [{ _id: orderId }, { orderNumber: orderId }];
    } else {
      query.orderNumber = orderId;
    }

    const order = await Order.findOne(query);
    if (!order) {
      return apiError("NOT_FOUND", "Order not found or access denied", 404);
    }

    const cancellableStatuses = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"];
    if (!cancellableStatuses.includes(order.fulfilmentStatus)) {
      return apiError(
        "ORDER_NOT_CANCELLABLE",
        `Order is currently ${order.fulfilmentStatus} and cannot be automatically cancelled online. Please contact customer care.`,
        409
      );
    }

    const previousStatus = order.fulfilmentStatus;
    order.fulfilmentStatus = "CANCELLATION_REQUESTED";
    order.cancellationReason = reason;

    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      type: "FULFILMENT",
      from: previousStatus,
      to: "CANCELLATION_REQUESTED",
      actorType: "CUSTOMER",
      actorId: String(auth.profile._id),
      reason,
      at: new Date(),
    });

    await order.save();

    return apiSuccess({
      orderNumber: order.orderNumber,
      fulfilmentStatus: order.fulfilmentStatus,
      message: "Cancellation request received and forwarded to fulfillment team",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to submit cancellation request";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
