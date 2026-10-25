import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay authentication credentials missing or unconfigured" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    const currency = (body?.currency || "INR").toUpperCase();
    const receipt = body?.receipt ? String(body.receipt) : `rcpt_${Date.now()}`;
    const notes = typeof body?.notes === "object" && body?.notes !== null ? body.notes : {};

    // Razorpay constraint: minimum amount is 100 paise (₹1.00)
    if (!amount || isNaN(amount) || amount < 100) {
      return NextResponse.json(
        {
          error: "Invalid amount. Minimum transaction amount is 100 paise (₹1.00)",
        },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt,
      notes,
    });

    return NextResponse.json(
      {
        success: true,
        order_id: order.id,
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        key_id: keyId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { statusCode?: number; error?: { description?: string; code?: string }; message?: string };
    const statusCode = err?.statusCode || 500;
    const errorMessage =
      err?.error?.description || err?.message || "Failed to create Razorpay order";

    console.error("Razorpay order creation error:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    );
  }
}
