import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay secret key is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Accept both standard Razorpay modal payload and camelCase keys
    const orderId = body?.razorpay_order_id || body?.order_id || body?.orderId;
    const paymentId = body?.razorpay_payment_id || body?.payment_id || body?.paymentId;
    const signature = body?.razorpay_signature || body?.signature || body?.razorpaySignature;

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          error:
            "Missing required fields. Please provide razorpay_order_id, razorpay_payment_id, and razorpay_signature.",
        },
        { status: 400 }
      );
    }

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    let isMatch = false;
    const generatedBuf = Buffer.from(generatedSignature, "utf-8");
    const receivedBuf = Buffer.from(signature, "utf-8");

    if (generatedBuf.length === receivedBuf.length) {
      isMatch = crypto.timingSafeEqual(generatedBuf, receivedBuf);
    }

    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: "Invalid signature. Payment verification failed.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        verified: true,
        message: "Payment signature verified successfully",
        order_id: orderId,
        payment_id: paymentId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Payment verification failed";
    console.error("Razorpay verification error:", error);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
