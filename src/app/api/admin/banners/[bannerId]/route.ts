import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Banner } from "@/models/Banner";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateBannerSchema = z.object({
  title: z.string().max(100).optional().nullable(),
  subtitle: z.string().max(300).optional().nullable(),
  imageUrl: z.string().min(1).optional(),
  imageAlt: z.string().optional(),
  mobileImageUrl: z.string().optional().nullable(),
  targetUrl: z.string().min(1).optional(),
  placement: z.enum(["HOME_HERO", "HOME_PROMO", "CATEGORY"]).optional(),
  textShadow: z.enum(["NONE", "SOFT", "CRISP", "STRONG"]).optional(),
  textSize: z.enum(["MD", "LG", "XL"]).optional(),
  textColor: z.enum(["DARK", "LIGHT", "GOLD"]).optional(),
  textBackdrop: z.enum(["FROSTED_LIGHT", "FROSTED_DARK", "SUBTLE_GRADIENT", "NONE"]).optional(),
  mobileFit: z.enum(["CONTAIN", "COVER"]).optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bannerId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { bannerId } = await params;
    const body = await req.json();

    const parsed = updateBannerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid banner update payload",
        400
      );
    }

    const {
      title,
      subtitle,
      imageUrl,
      imageAlt,
      mobileImageUrl,
      targetUrl,
      placement,
      textShadow,
      textSize,
      textColor,
      textBackdrop,
      mobileFit,
      sortOrder,
      status,
    } = parsed.data;

    const updatePayload: Record<string, any> = {};

    if (title !== undefined) updatePayload.title = title || "";
    if (subtitle !== undefined) updatePayload.subtitle = subtitle || "";
    if (imageUrl !== undefined) {
      updatePayload.image = {
        url: imageUrl,
        publicId: `banner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        alt: imageAlt || title || "NIYAT Hero Banner",
      };
    } else if (imageAlt !== undefined) {
      updatePayload["image.alt"] = imageAlt;
    }

    if (mobileImageUrl !== undefined) {
      if (mobileImageUrl && typeof mobileImageUrl === "string" && mobileImageUrl.trim()) {
        updatePayload.mobileImage = {
          url: mobileImageUrl.trim(),
          publicId: `banner_mob_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          alt: imageAlt || title || "NIYAT Hero Banner Mobile",
        };
      } else {
        updatePayload.mobileImage = {
          url: "",
          publicId: "",
          alt: "",
        };
      }
    }

    if (targetUrl !== undefined) updatePayload.targetUrl = targetUrl;
    if (placement !== undefined) updatePayload.placement = placement;
    if (textShadow !== undefined) updatePayload.textShadow = textShadow;
    if (textSize !== undefined) updatePayload.textSize = textSize;
    if (textColor !== undefined) updatePayload.textColor = textColor;
    if (textBackdrop !== undefined) updatePayload.textBackdrop = textBackdrop;
    if (mobileFit !== undefined) updatePayload.mobileFit = mobileFit;
    if (sortOrder !== undefined) updatePayload.sortOrder = sortOrder;
    if (status !== undefined) updatePayload.status = status;

    const banner = await Banner.findByIdAndUpdate(
      bannerId,
      { $set: updatePayload },
      { new: true }
    ).lean();

    if (!banner) {
      return apiError("NOT_FOUND", "Banner not found", 404);
    }

    return apiSuccess({
      id: String(banner._id),
      title: banner.title,
      subtitle: banner.subtitle,
      image: banner.image,
      mobileImage: banner.mobileImage,
      targetUrl: banner.targetUrl,
      status: banner.status,
      message: "Banner updated successfully",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update banner";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bannerId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { bannerId } = await params;

    const banner = await Banner.findByIdAndDelete(bannerId);
    if (!banner) {
      return apiError("NOT_FOUND", "Banner not found", 404);
    }

    return apiSuccess({ message: "Banner deleted successfully" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete banner";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
