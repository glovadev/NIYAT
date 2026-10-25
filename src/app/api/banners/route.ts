import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Banner } from "@/models/Banner";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const placement = searchParams.get("placement");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { status: "ACTIVE" };

    if (placement) {
      filter.placement = placement;
    }

    const now = new Date();
    // Only return banners where now is within startsAt and endsAt if defined
    filter.$and = [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }, { startsAt: null }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: now } }, { endsAt: null }] },
    ];

    const banners = await Banner.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean();

    return apiSuccess({
      items: banners.map((b) => ({
        id: String(b._id),
        title: b.title,
        subtitle: b.subtitle,
        image: b.image,
        placement: b.placement,
        targetUrl: b.targetUrl,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch banners";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
