import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { verifyWebhookSecret } from "@/lib/shiprocket/webhook-auth";
import { processShiprocketWebhook } from "@/lib/shiprocket/webhook-processor";
import { safeWarn } from "@/lib/shiprocket/sanitize";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Strict Authentication: Validate x-api-key using constant-time comparison
  const apiKey = req.headers.get("x-api-key");
  if (!verifyWebhookSecret(apiKey)) {
    safeWarn("Webhook", "Unauthorized webhook attempt: invalid or missing x-api-key header");
    return NextResponse.json(
      {
        success: false,
        error: "UNAUTHORIZED",
        message: "Invalid or missing webhook authentication credentials",
      },
      { status: 401 }
    );
  }

  // 2. Parse payload safely
  let payload: unknown;
  try {
    payload = await req.json();
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_JSON",
        message: "Malformed JSON payload in webhook request",
      },
      { status: 400 }
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_PAYLOAD",
        message: "Webhook payload must be a non-empty JSON object",
      },
      { status: 400 }
    );
  }

  // 3. Connect to database and process event
  try {
    await connectToDatabase();
    const result = await processShiprocketWebhook(payload as Record<string, unknown>);

    return NextResponse.json(
      {
        success: result.success,
        duplicate: result.duplicate,
        matched: result.matched,
        eventId: result.eventId,
        orderNumber: result.orderNumber,
        newFulfillmentStatus: result.newFulfillmentStatus,
        shippingStatus: result.shippingStatus,
        message: result.message,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal webhook processing error";
    return NextResponse.json(
      {
        success: false,
        error: "PROCESSING_ERROR",
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}

