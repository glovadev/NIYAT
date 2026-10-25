import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Review } from "@/models/Review";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const productId = searchParams.get("productId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    if (status && status !== "ALL") {
      query.moderationStatus = status;
    }
    if (productId) {
      query.productId = productId;
    }

    const totalItems = await Review.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const reviews = await Review.find(query)
      .populate("productId", "name slug")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return apiSuccess({
      items: reviews.map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prod = r.productId as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = r.userId as any;
        return {
          id: String(r._id),
          productName: prod?.name || "Unknown Product",
          productSlug: prod?.slug,
          customerName: user?.name || "Customer",
          customerEmail: user?.email,
          rating: r.rating,
          title: r.title,
          body: r.body,
          moderationStatus: r.moderationStatus,
          verificationStatus: r.verificationStatus,
          createdAt: r.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load reviews";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
