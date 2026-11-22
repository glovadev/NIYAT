import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Notice } from "@/models/Notice";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

const noticeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(2000),
  badge: z.string().max(60).optional().default("Notice & Update"),
  linkUrl: z.string().max(500).optional().default(""),
  linkText: z.string().max(60).optional().default(""),
  theme: z.enum(["EMERALD", "GOLD", "DARK", "AMBER"]).default("EMERALD"),
  icon: z.enum(["SPARKLES", "BELL", "ALERT", "TRUCK", "GIFT", "INFO"]).default("SPARKLES"),
  isActive: z.boolean().default(false),
  showOnTopBar: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();

    const notices = await Notice.find()
      .sort({ isActive: -1, sortOrder: 1, updatedAt: -1 })
      .lean();

    const activeNotice = notices.find((n) => n.isActive) || null;

    return apiSuccess({
      items: notices.map((n) => ({
        id: String(n._id),
        title: n.title,
        message: n.message,
        badge: n.badge,
        linkUrl: n.linkUrl || "",
        linkText: n.linkText || "",
        theme: n.theme,
        icon: n.icon,
        isActive: Boolean(n.isActive),
        showOnTopBar: Boolean(n.showOnTopBar),
        sortOrder: n.sortOrder ?? 0,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      activeNoticeId: activeNotice ? String(activeNotice._id) : null,
      isAnyActive: Boolean(activeNotice),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load notices";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    const body = await req.json();
    const parsed = noticeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid notice payload",
        400
      );
    }

    await connectToDatabase();

    // If making this notice active, deactivate other notices to keep a single primary active notice
    if (parsed.data.isActive) {
      await Notice.updateMany({ isActive: true }, { $set: { isActive: false } });
    }

    const created = await Notice.create({
      title: parsed.data.title.trim(),
      message: parsed.data.message.trim(),
      badge: (parsed.data.badge || "Notice & Update").trim(),
      linkUrl: (parsed.data.linkUrl || "").trim(),
      linkText: (parsed.data.linkText || "").trim(),
      theme: parsed.data.theme,
      icon: parsed.data.icon,
      isActive: parsed.data.isActive,
      showOnTopBar: parsed.data.showOnTopBar,
      sortOrder: parsed.data.sortOrder,
    });

    return apiSuccess(
      {
        id: String(created._id),
        title: created.title,
        message: created.message,
        badge: created.badge,
        linkUrl: created.linkUrl,
        linkText: created.linkText,
        theme: created.theme,
        icon: created.icon,
        isActive: created.isActive,
        showOnTopBar: created.showOnTopBar,
        sortOrder: created.sortOrder,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
      undefined,
      201
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create notice";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
