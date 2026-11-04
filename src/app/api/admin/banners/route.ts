import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Banner } from "@/models/Banner";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createBannerSchema = z.object({
  title: z.string().max(100).optional().default(""),
  subtitle: z.string().max(300).optional().default(""),
  imageUrl: z.string().min(1, "A valid image URL is required"),
  imageAlt: z.string().optional(),
  mobileImageUrl: z.string().optional().default(""),
  targetUrl: z.string().min(1, "Product or page link is required"),
  placement: z.enum(["HOME_HERO", "HOME_PROMO", "CATEGORY"]).default("HOME_HERO"),
  textShadow: z.enum(["NONE", "SOFT", "CRISP", "STRONG"]).default("CRISP"),
  textSize: z.enum(["MD", "LG", "XL"]).default("LG"),
  textColor: z.enum(["DARK", "LIGHT", "GOLD"]).default("DARK"),
  textBackdrop: z.enum(["FROSTED_LIGHT", "FROSTED_DARK", "SUBTLE_GRADIENT", "NONE"]).default("FROSTED_LIGHT"),
  mobileFit: z.enum(["CONTAIN", "COVER"]).default("CONTAIN"),
  sortOrder: z.number().int().default(0),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
});

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const placement = searchParams.get("placement") || "HOME_HERO";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    if (placement !== "ALL") {
      query.placement = placement;
    }

    const banners = await Banner.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return apiSuccess({
      items: banners.map((b) => ({
        id: String(b._id),
        title: b.title,
        subtitle: b.subtitle,
        image: b.image,
        mobileImage: b.mobileImage,
        targetUrl: b.targetUrl,
        placement: b.placement,
        textShadow: b.textShadow || "CRISP",
        textSize: b.textSize || "LG",
        textColor: b.textColor || "DARK",
        textBackdrop: b.textBackdrop || "FROSTED_LIGHT",
        mobileFit: b.mobileFit || "CONTAIN",
        sortOrder: b.sortOrder,
        status: b.status,
        createdAt: b.createdAt,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load banners";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const body = await req.json();

    const parsed = createBannerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid banner details",
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

    const banner = await Banner.create({
      title,
      subtitle,
      image: {
        url: imageUrl,
        publicId: `banner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        alt: imageAlt || title || "NIYAT Hero Banner",
      },
      mobileImage:
        mobileImageUrl && mobileImageUrl.trim()
          ? {
              url: mobileImageUrl.trim(),
              publicId: `banner_mob_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              alt: imageAlt || title || "NIYAT Hero Banner Mobile",
            }
          : { url: "", publicId: "", alt: "" },
      targetUrl,
      placement,
      textShadow,
      textSize,
      textColor,
      textBackdrop,
      mobileFit,
      sortOrder,
      status,
    });

    return apiSuccess(
      {
        id: String(banner._id),
        title: banner.title,
        subtitle: banner.subtitle,
        image: banner.image,
        mobileImage: banner.mobileImage,
        targetUrl: banner.targetUrl,
        status: banner.status,
      },
      undefined,
      201
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create banner";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
