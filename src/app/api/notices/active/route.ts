import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Notice } from "@/models/Notice";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    const now = new Date();
    const activeNotice = await Notice.findOne({
      isActive: true,
      $and: [
        {
          $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }],
        },
        {
          $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }],
        },
      ],
    })
      .sort({ sortOrder: 1, updatedAt: -1 })
      .lean();

    if (!activeNotice) {
      return apiSuccess({ notice: null });
    }

    return apiSuccess({
      notice: {
        id: String(activeNotice._id),
        title: activeNotice.title,
        message: activeNotice.message,
        badge: activeNotice.badge || "Notice & Update",
        linkUrl: activeNotice.linkUrl || "",
        linkText: activeNotice.linkText || "",
        theme: activeNotice.theme || "EMERALD",
        icon: activeNotice.icon || "SPARKLES",
        showOnTopBar: Boolean(activeNotice.showOnTopBar),
        updatedAt: activeNotice.updatedAt,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch active notice";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
