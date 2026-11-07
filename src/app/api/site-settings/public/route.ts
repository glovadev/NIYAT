import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { SiteSettings } from "@/models/SiteSettings";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    const settingsDoc = await SiteSettings.findOne({ key: "default" });
    const settings = settingsDoc || (await SiteSettings.create({ key: "default" }));

    // Expose only public safe configuration fields
    const publicSettings = {
      brandName: settings.brandName,
      currency: settings.currency,
      freeShippingThresholdPaise: settings.freeShippingThresholdPaise,
      standardShippingFeePaise: settings.standardShippingFeePaise,
      isFreeDeliveryOfferActive: Boolean(settings.isFreeDeliveryOfferActive),
      freeDeliveryBannerText:
        settings.freeDeliveryBannerText ||
        "Special Offer: Complimentary Free Delivery Active on All Orders!",
      codEnabled: settings.codEnabled,
      codMinOrderPaise: settings.codMinOrderPaise,
      codMaxOrderPaise: settings.codMaxOrderPaise,
      announcementBar: settings.announcementBar,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
    };

    return apiSuccess(publicSettings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch settings";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
