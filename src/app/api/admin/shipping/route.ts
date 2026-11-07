import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { SiteSettings } from "@/models/SiteSettings";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

const updateShippingSchema = z.object({
  standardShippingFeeRupees: z.number().min(0).optional(),
  standardShippingFeePaise: z.number().int().min(0).optional(),
  freeShippingThresholdRupees: z.number().min(0).optional(),
  freeShippingThresholdPaise: z.number().int().min(0).optional(),
  isFreeDeliveryOfferActive: z.boolean().optional(),
  freeDeliveryBannerText: z.string().max(250).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    let settings = await SiteSettings.findOne({ key: "default" });
    if (!settings) {
      settings = await SiteSettings.create({ key: "default" });
    }

    return apiSuccess({
      standardShippingFeePaise: settings.standardShippingFeePaise ?? 9900,
      freeShippingThresholdPaise: settings.freeShippingThresholdPaise ?? 99900,
      isFreeDeliveryOfferActive: Boolean(settings.isFreeDeliveryOfferActive),
      freeDeliveryBannerText:
        settings.freeDeliveryBannerText ||
        "Limited Time: Complimentary Free Delivery on All Orders!",
      updatedAt: settings.updatedAt,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load shipping settings";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    const body = await req.json();
    const parsed = updateShippingSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid shipping settings payload",
        400
      );
    }

    await connectToDatabase();

    const updateFields: Record<string, unknown> = {};

    // Standard Shipping Fee (accepts either Rupees or Paise)
    if (parsed.data.standardShippingFeeRupees !== undefined) {
      updateFields.standardShippingFeePaise = Math.round(
        parsed.data.standardShippingFeeRupees * 100
      );
    } else if (parsed.data.standardShippingFeePaise !== undefined) {
      updateFields.standardShippingFeePaise = parsed.data.standardShippingFeePaise;
    }

    // Minimum Order Value for Free Delivery (accepts either Rupees or Paise)
    if (parsed.data.freeShippingThresholdRupees !== undefined) {
      updateFields.freeShippingThresholdPaise = Math.round(
        parsed.data.freeShippingThresholdRupees * 100
      );
    } else if (parsed.data.freeShippingThresholdPaise !== undefined) {
      updateFields.freeShippingThresholdPaise = parsed.data.freeShippingThresholdPaise;
    }

    // Free Delivery Global Offer toggle
    if (parsed.data.isFreeDeliveryOfferActive !== undefined) {
      updateFields.isFreeDeliveryOfferActive = parsed.data.isFreeDeliveryOfferActive;
    }

    // Promotional banner text
    if (parsed.data.freeDeliveryBannerText !== undefined) {
      updateFields.freeDeliveryBannerText = parsed.data.freeDeliveryBannerText.trim();
    }

    const settings = await SiteSettings.findOneAndUpdate(
      { key: "default" },
      { $set: updateFields },
      { upsert: true, new: true }
    );

    return apiSuccess({
      standardShippingFeePaise: settings.standardShippingFeePaise,
      freeShippingThresholdPaise: settings.freeShippingThresholdPaise,
      isFreeDeliveryOfferActive: Boolean(settings.isFreeDeliveryOfferActive),
      freeDeliveryBannerText: settings.freeDeliveryBannerText,
      updatedAt: settings.updatedAt,
      message: "Shipping rules updated successfully",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update shipping rules";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

