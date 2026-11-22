import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { SiteSettings } from "@/models/SiteSettings";
import { Notice } from "@/models/Notice";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    const [settingsDoc, activeNoticeDoc] = await Promise.all([
      SiteSettings.findOne({ key: "default" }),
      Notice.findOne({ isActive: true }).sort({ sortOrder: 1, updatedAt: -1 }).lean(),
    ]);

    const settings = settingsDoc || (await SiteSettings.create({ key: "default" }));

    const activeNotice = activeNoticeDoc
      ? {
          id: String(activeNoticeDoc._id),
          title: activeNoticeDoc.title,
          message: activeNoticeDoc.message,
          badge: activeNoticeDoc.badge || "Notice & Update",
          linkUrl: activeNoticeDoc.linkUrl || "",
          linkText: activeNoticeDoc.linkText || "",
          theme: activeNoticeDoc.theme || "EMERALD",
          icon: activeNoticeDoc.icon || "SPARKLES",
          showOnTopBar: Boolean(activeNoticeDoc.showOnTopBar),
        }
      : null;

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
      activeNotice,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
    };

    return apiSuccess(publicSettings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch settings";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
