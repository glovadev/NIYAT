import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function POST(
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

    if (order.paymentMethod !== "COD") {
      return apiError(
        "INVALID_OPERATION",
        "Only Cash on Delivery orders can be marked as cash collected",
        400
      );
    }

    if (order.paymentStatus === "PAID") {
      return apiError("CONFLICT", "This order is already marked as PAID", 409);
    }

    order.paymentStatus = "PAID";
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      type: "PAYMENT",
      to: "PAID",
      actorType: "ADMIN",
      actorId: String(adminCheck.context?.profile._id),
      reason: "COD Cash collected upon delivery",
      at: new Date(),
    });

    await order.save();

    // Create or update Payment record
    await Payment.create({
      orderId: order._id,
      provider: "COD",
      amountPaise: order.totalPaise,
      currency: "INR",
      status: "PAID",
      paidAt: new Date(),
    });

    return apiSuccess({
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      message: "COD cash collection recorded successfully",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to record COD collection";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
