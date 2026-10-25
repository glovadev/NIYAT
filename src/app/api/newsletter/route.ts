import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { NewsletterSubscription } from "@/models/NewsletterSubscription";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

const newsletterSchema = z.object({
  email: z.string().email("Please provide a valid email address").toLowerCase().trim(),
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const result = newsletterSchema.safeParse(body);

    if (!result.success) {
      return apiError(
        "VALIDATION_ERROR",
        result.error.errors[0]?.message || "Invalid email address",
        400
      );
    }

    const { email } = result.data;

    const existing = await NewsletterSubscription.findOne({ email });

    if (existing) {
      if (existing.status === "UNSUBSCRIBED") {
        existing.status = "ACTIVE";
        existing.subscribedAt = new Date();
        await existing.save();
      }
      return apiSuccess({
        message: "You are subscribed to the NIYAT newsletter.",
      });
    }

    await NewsletterSubscription.create({
      email,
      status: "ACTIVE",
      source: "STOREFRONT_FOOTER",
      subscribedAt: new Date(),
    });

    return apiSuccess(
      {
        message: "Thank you for subscribing to NIYAT skincare updates.",
      },
      undefined,
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to subscribe";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
