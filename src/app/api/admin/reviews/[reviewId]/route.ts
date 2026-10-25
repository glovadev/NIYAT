import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Review } from "@/models/Review";
import { Product } from "@/models/Product";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const moderateSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  moderationNote: z.string().optional(),
});

async function recalculateProductRating(productId: unknown) {
  const approvedReviews = await Review.find({
    productId,
    moderationStatus: "APPROVED",
  });
  const count = approvedReviews.length;
  const avg =
    count > 0
      ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / count
      : 5.0;

  await Product.findByIdAndUpdate(productId, {
    ratingAverage: Number(avg.toFixed(1)),
    ratingCount: count,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { reviewId } = await params;
    const body = await req.json();

    const parsed = moderateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid status",
        400
      );
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return apiError("NOT_FOUND", "Review not found", 404);
    }

    review.moderationStatus = parsed.data.status;
    await review.save();

    await recalculateProductRating(review.productId);

    return apiSuccess({
      reviewId: String(review._id),
      moderationStatus: review.moderationStatus,
      message: `Review marked as ${review.moderationStatus}`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to moderate review";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "ADMIN");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { reviewId } = await params;

    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) {
      return apiError("NOT_FOUND", "Review not found", 404);
    }

    await recalculateProductRating(review.productId);

    return apiSuccess({ message: "Review deleted successfully" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete review";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
