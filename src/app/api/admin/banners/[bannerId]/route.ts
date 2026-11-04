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
  targetUrl: z.string().min(1).optional(),
  placement: z.enum(["HOME_HERO", "HOME_PROMO", "CATEGORY"]).optional(),
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

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return apiError("NOT_FOUND", "Banner not found", 404);
    }

    const {
      title,
      subtitle,
      imageUrl,
      imageAlt,
      targetUrl,
      placement,
      sortOrder,
      status,
    } = parsed.data;

    if (title !== undefined) banner.title = title || "";
    if (subtitle !== undefined) banner.subtitle = subtitle || "";
    if (imageUrl !== undefined) {
      banner.image.url = imageUrl;
      if (imageAlt !== undefined) banner.image.alt = imageAlt;
    } else if (imageAlt !== undefined) {
      banner.image.alt = imageAlt;
    }
    if (targetUrl !== undefined) banner.targetUrl = targetUrl;
    if (placement !== undefined) banner.placement = placement;
    if (sortOrder !== undefined) banner.sortOrder = sortOrder;
    if (status !== undefined) banner.status = status;

    await banner.save();

    return apiSuccess({
      id: String(banner._id),
      title: banner.title,
      subtitle: banner.subtitle,
      image: banner.image,
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
