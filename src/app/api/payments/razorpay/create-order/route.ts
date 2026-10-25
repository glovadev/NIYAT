import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { verifyGuestOrderToken } from "@/lib/auth/guest-token";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { apiSuccess, apiError } from "@/lib/api/response";
import Razorpay from "razorpay";
import { serverEnv } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    const guestToken = req.headers.get("x-guest-order-token");
    const body = await req.json();
    const orderId = body?.orderId;

    if (!orderId) {
      return apiError("VALIDATION_ERROR", "orderId is required", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return apiError("NOT_FOUND", "Order not found", 404);
    }

    // Verify ownership: customer account or guest token
    let isAuthorized = false;
    if (auth && String(order.userId) === String(auth.profile._id)) {
      isAuthorized = true;
    } else if (guestToken) {
      const payload = verifyGuestOrderToken(guestToken);
      if (payload && payload.orderId === String(order._id)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return apiError("FORBIDDEN", "You are not authorized to pay for this order", 403);
    }

    if (order.paymentStatus === "PAID") {
      return apiError("ORDER_ALREADY_PAID", "This order is already paid", 409);
    }

    if (order.totalPaise < 100) {
      return apiError("BAD_REQUEST", "Minimum amount to create Razorpay order is 100 paise (₹1.00)", 400);
    }

    let razorpayOrderId: string;
    const keyId = serverEnv.RAZORPAY_KEY_ID || "rzp_test_placeholder";
    const keySecret = serverEnv.RAZORPAY_KEY_SECRET;

    // Check if live/test credentials are configured
    if (
      keyId &&
      keySecret &&
      !keyId.includes("placeholder") &&
      !keySecret.includes("placeholder")
    ) {
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const rzpOrder = await razorpay.orders.create({
        amount: order.totalPaise,
        currency: "INR",
        receipt: order.orderNumber,
        notes: {
          orderId: String(order._id),
          orderNumber: order.orderNumber,
        },
      });

      razorpayOrderId = rzpOrder.id;
    } else {
      // Development sandbox mock order
      razorpayOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // Create payment attempt record
    await Payment.create({
      orderId: order._id,
      provider: "RAZORPAY",
      providerOrderId: razorpayOrderId,
      amountPaise: order.totalPaise,
      currency: "INR",
      status: "CREATED",
    });

    return apiSuccess({
      razorpayOrderId,
      amountPaise: order.totalPaise,
      currency: "INR",
      keyId,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      customerEmail: order.customer.email,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create Razorpay payment order";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
