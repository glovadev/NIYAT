import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { cancelAwbShipment } from "@/lib/shiprocket";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const cancelAwbSchema = z.object({
  reason: z.string().min(5, "A cancellation reason of at least 5 characters is required"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "ADMIN");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { orderId } = await params;
    const body = await req.json();

    const parsed = cancelAwbSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid payload", 400);
    }

    const adminProfile = adminCheck.context?.profile;
    const updatedOrder = await cancelAwbShipment(
      orderId,
      String(adminProfile?._id || "manager"),
      adminProfile?.email || "manager@niyat.in",
      parsed.data.reason
    );

    return apiSuccess({
      orderNumber: updatedOrder.orderNumber,
      shipment: updatedOrder.shipment,
      message: "AWB cancelled. Courier reassignment has been blocked pending administrative review.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to cancel AWB";
    return apiError("AWB_CANCELLATION_FAILED", msg, 400);
  }
}
