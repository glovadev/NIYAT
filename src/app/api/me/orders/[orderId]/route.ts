import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { Order } from "@/models/Order";
import { apiSuccess, apiError } from "@/lib/api/response";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return apiError("UNAUTHENTICATED", "Please log in to view order details", 401);
    }

    const { orderId } = await params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId: auth.profile._id };
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      query.$or = [{ _id: orderId }, { orderNumber: orderId }];
    } else {
      query.orderNumber = orderId;
    }

    const order = await Order.findOne(query).lean();
    if (!order) {
      return apiError("NOT_FOUND", "Order not found or access denied", 404);
    }

    return apiSuccess({
      id: String(order._id),
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      fulfilmentStatus: order.fulfilmentStatus,
      subtotalPaise: order.subtotalPaise,
      discountPaise: order.discountPaise,
      shippingPaise: order.shippingPaise,
      taxPaise: order.taxPaise,
      totalPaise: order.totalPaise,
      currency: order.currency,
      coupon: order.coupon,
      cancellationReason: order.cancellationReason,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      items: order.items,
      shipment: order.shipment,
      timeline: (order.statusHistory || []).map((h) => ({
        type: h.type,
        to: h.to,
        at: h.at,
        reason: h.reason,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load order";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
