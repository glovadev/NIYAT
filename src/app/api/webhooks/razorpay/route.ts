import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { WebhookEvent } from "@/models/WebhookEvent";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import crypto from "crypto";
import { serverEnv } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = serverEnv.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature if secret configured
    if (webhookSecret && !webhookSecret.includes("placeholder")) {
      if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
      }

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventId = event?.event_id || event?.id || `evt_${Date.now()}`;
    const eventType = event?.event;

    // Idempotency check: record event in WebhookEvent collection
    const existing = await WebhookEvent.findOne({
      provider: "RAZORPAY",
      eventId,
    });

    if (existing) {
      return NextResponse.json({ status: "already_processed" }, { status: 200 });
    }

    const eventDoc = await WebhookEvent.create({
      provider: "RAZORPAY",
      eventId,
      eventType,
      payload: event,
      status: "RECEIVED",
    });

    // Handle payment events
    if (eventType === "payment.captured") {
      const paymentEntity = event?.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        // Find payment by providerOrderId
        const payment = await Payment.findOne({ providerOrderId: razorpayOrderId });
        if (payment) {
          payment.status = "PAID";
          payment.providerPaymentId = razorpayPaymentId;
          payment.paidAt = new Date();
          payment.signatureVerified = true;
          await payment.save();

          // Update corresponding order
          const order = await Order.findById(payment.orderId);
          if (order && order.paymentStatus !== "PAID") {
            order.paymentStatus = "PAID";
            order.fulfilmentStatus = "CONFIRMED";
            if (!order.statusHistory) order.statusHistory = [];
            order.statusHistory.push({
              type: "PAYMENT",
              to: "PAID",
              actorType: "WEBHOOK",
              reason: `Razorpay webhook payment.captured (${razorpayPaymentId})`,
              at: new Date(),
            });
            await order.save();

            // Deduct stock if not already applied
            if (!order.stockAppliedAt) {
              for (const item of order.items) {
                await Product.findByIdAndUpdate(item.productId, {
                  $inc: { stockQuantity: -item.quantity },
                });
              }
              order.stockAppliedAt = new Date();
              await order.save();
            }
          }
        }
      }
    } else if (eventType === "payment.failed") {
      const paymentEntity = event?.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      if (razorpayOrderId) {
        await Payment.findOneAndUpdate(
          { providerOrderId: razorpayOrderId },
          {
            status: "FAILED",
            failureCode: paymentEntity?.error_code,
            failureDescription: paymentEntity?.error_description,
          }
        );
      }
    }

    eventDoc.status = "PROCESSED";
    eventDoc.processedAt = new Date();
    await eventDoc.save();

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Razorpay webhook processing error:", error);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}
