import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Coupon } from "@/models/Coupon";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

const patchCouponSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().transform((v) => new Date(v)).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    const { couponId } = await params;
    if (!couponId || !mongoose.isValidObjectId(couponId)) {
      return apiError("VALIDATION_ERROR", "Invalid coupon identifier", 400);
    }

    const body = await req.json();
    const parsed = patchCouponSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid coupon update parameters",
        400
      );
    }

    await connectToDatabase();

    const updateFields: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) {
      updateFields.status = parsed.data.status;
    }
    if (parsed.data.usageLimit !== undefined) {
      updateFields.usageLimit = parsed.data.usageLimit;
    }
    if (parsed.data.expiresAt !== undefined) {
      updateFields.expiresAt = parsed.data.expiresAt;
    }

    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      { $set: updateFields },
      { new: true }
    );

    if (!coupon) {
      return apiError("NOT_FOUND", "Coupon not found", 404);
    }

    return apiSuccess({
      id: String(coupon._id),
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      status: coupon.status,
      expiresAt: coupon.expiresAt,
      usageLimit: coupon.usageLimit,
      usedCount: coupon.usedCount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update coupon";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "ADMIN");
    if (!adminCheck.authorized) return adminCheck.response!;

    const { couponId } = await params;
    if (!couponId || !mongoose.isValidObjectId(couponId)) {
      return apiError("VALIDATION_ERROR", "Invalid coupon identifier", 400);
    }

    await connectToDatabase();
    const coupon = await Coupon.findByIdAndDelete(couponId);

    if (!coupon) {
      return apiError("NOT_FOUND", "Coupon not found", 404);
    }

    return apiSuccess({
      id: couponId,
      message: "Coupon removed permanently",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to remove coupon";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

