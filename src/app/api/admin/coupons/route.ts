import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Coupon } from "@/models/Coupon";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createCouponSchema = z.object({
  code: z.string().min(2).max(30).toUpperCase(),
  type: z.enum(["FIXED", "PERCENTAGE"]),
  value: z.number().positive(),
  minimumOrderPaise: z.number().int().min(0).default(0),
  maximumDiscountPaise: z.number().int().min(0).optional(),
  startsAt: z.string().transform((v) => new Date(v)),
  expiresAt: z.string().transform((v) => new Date(v)),
  usageLimit: z.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();

    return apiSuccess({
      items: coupons.map((c) => ({
        id: String(c._id),
        code: c.code,
        type: c.type,
        value: c.value,
        minimumOrderPaise: c.minimumOrderPaise,
        maximumDiscountPaise: c.maximumDiscountPaise,
        startsAt: c.startsAt,
        expiresAt: c.expiresAt,
        usageLimit: c.usageLimit,
        usedCount: c.usedCount,
        status: c.status,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load coupons";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const body = await req.json();

    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid coupon details",
        400
      );
    }

    const existing = await Coupon.findOne({ code: parsed.data.code });
    if (existing) {
      return apiError("CONFLICT", "A coupon with this code already exists", 409);
    }

    const coupon = await Coupon.create(parsed.data);

    return apiSuccess(
      {
        id: String(coupon._id),
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        status: coupon.status,
      },
      undefined,
      201
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create coupon";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
