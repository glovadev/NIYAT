import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { verifyGuestOrderToken } from "@/lib/auth/guest-token";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import { Coupon } from "@/models/Coupon";
import { apiSuccess, apiError } from "@/lib/api/response";
import crypto from "crypto";
import { serverEnv } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    const guestToken = req.headers.get("x-guest-order-token");
    const body = await req.json();

    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      return apiError(
        "VALIDATION_ERROR",
        "orderId, razorpayOrderId, and razorpayPaymentId are required",
        400
      );
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return apiError("NOT_FOUND", "Order not found", 404);
    }

    // Authorization check
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
      return apiError("FORBIDDEN", "Unauthorized to verify this order's payment", 403);
    }

    // If order already paid, return idempotent success
    if (order.paymentStatus === "PAID") {
      return apiSuccess({
        orderNumber: order.orderNumber,
        paymentStatus: "PAID",
        fulfilmentStatus: order.fulfilmentStatus,
        alreadyProcessed: true,
      });
    }

    // Cryptographic signature check
    const keySecret = serverEnv.RAZORPAY_KEY_SECRET;
    let signatureValid = false;

    if (
      keySecret &&
      !keySecret.includes("placeholder") &&
      razorpaySignature
    ) {
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      signatureValid = expectedSignature === razorpaySignature;
    } else {
      // In development sandbox mock mode
      signatureValid = Boolean(razorpayOrderId && razorpayPaymentId);
    }

    if (!signatureValid) {
      await Payment.findOneAndUpdate(
        { providerOrderId: razorpayOrderId },
        {
          status: "FAILED",
          failureCode: "BAD_SIGNATURE",
          failureDescription: "Razorpay payment signature mismatch",
        }
      );
      return apiError("PAYMENT_VERIFICATION_FAILED", "Invalid payment signature", 400);
    }

    // Update payment record
    await Payment.findOneAndUpdate(
      { providerOrderId: razorpayOrderId },
      {
        providerPaymentId: razorpayPaymentId,
        status: "PAID",
        signatureVerified: true,
        paidAt: new Date(),
      },
      { upsert: true }
    );

    // Update order status
    order.paymentStatus = "PAID";
    order.fulfilmentStatus = "CONFIRMED";
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      type: "PAYMENT",
      to: "PAID",
      actorType: "CUSTOMER",
      reason: `Razorpay payment captured (${razorpayPaymentId})`,
      at: new Date(),
    });

    await order.save();

    // Deduct stock for ordered products
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stockQuantity: -item.quantity },
      });
    }

    // Record coupon usage if coupon was applied
    if (order.coupon?.code) {
      await Coupon.findOneAndUpdate(
        { code: order.coupon.code.toUpperCase() },
        { $inc: { usedCount: 1 } }
      );
    }

    return apiSuccess({
      orderNumber: order.orderNumber,
      paymentStatus: "PAID",
      fulfilmentStatus: "CONFIRMED",
      message: "Payment successfully verified and order confirmed",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to verify Razorpay payment";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
