import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Notice } from "@/models/Notice";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

const updateNoticeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(2000).optional(),
  badge: z.string().max(60).optional(),
  linkUrl: z.string().max(500).optional(),
  linkText: z.string().max(60).optional(),
  theme: z.enum(["EMERALD", "GOLD", "DARK", "AMBER"]).optional(),
  icon: z.enum(["SPARKLES", "BELL", "ALERT", "TRUCK", "GIFT", "INFO"]).optional(),
  isActive: z.boolean().optional(),
  showOnTopBar: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    const { id } = await params;
    await connectToDatabase();

    const notice = await Notice.findById(id).lean();
    if (!notice) {
      return apiError("NOT_FOUND", "Notice not found", 404);
    }

    return apiSuccess({
      id: String(notice._id),
      title: notice.title,
      message: notice.message,
      badge: notice.badge,
      linkUrl: notice.linkUrl || "",
      linkText: notice.linkText || "",
      theme: notice.theme,
      icon: notice.icon,
      isActive: Boolean(notice.isActive),
      showOnTopBar: Boolean(notice.showOnTopBar),
      sortOrder: notice.sortOrder ?? 0,
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load notice";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    const { id } = await params;
    const body = await req.json();
    const parsed = updateNoticeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid update payload",
        400
      );
    }

    await connectToDatabase();

    const notice = await Notice.findById(id);
    if (!notice) {
      return apiError("NOT_FOUND", "Notice not found", 404);
    }

    // If activating this notice, deactivate other notices so only one is active at a time
    if (parsed.data.isActive === true) {
      await Notice.updateMany(
        { _id: { $ne: notice._id }, isActive: true },
        { $set: { isActive: false } }
      );
    }

    if (parsed.data.title !== undefined) notice.title = parsed.data.title.trim();
    if (parsed.data.message !== undefined) notice.message = parsed.data.message.trim();
    if (parsed.data.badge !== undefined) notice.badge = parsed.data.badge.trim();
    if (parsed.data.linkUrl !== undefined) notice.linkUrl = parsed.data.linkUrl.trim();
    if (parsed.data.linkText !== undefined) notice.linkText = parsed.data.linkText.trim();
    if (parsed.data.theme !== undefined) notice.theme = parsed.data.theme;
    if (parsed.data.icon !== undefined) notice.icon = parsed.data.icon;
    if (parsed.data.isActive !== undefined) notice.isActive = parsed.data.isActive;
    if (parsed.data.showOnTopBar !== undefined) notice.showOnTopBar = parsed.data.showOnTopBar;
    if (parsed.data.sortOrder !== undefined) notice.sortOrder = parsed.data.sortOrder;

    await notice.save();

    return apiSuccess({
      id: String(notice._id),
      title: notice.title,
      message: notice.message,
      badge: notice.badge,
      linkUrl: notice.linkUrl,
      linkText: notice.linkText,
      theme: notice.theme,
      icon: notice.icon,
      isActive: notice.isActive,
      showOnTopBar: notice.showOnTopBar,
      sortOrder: notice.sortOrder,
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update notice";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    const { id } = await params;
    await connectToDatabase();

    const deleted = await Notice.findByIdAndDelete(id);
    if (!deleted) {
      return apiError("NOT_FOUND", "Notice not found", 404);
    }

    return apiSuccess({ message: "Notice deleted successfully", id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete notice";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
