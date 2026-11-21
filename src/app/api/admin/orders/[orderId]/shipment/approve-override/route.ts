import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { approveEmergencyOverride, ShiprocketValidationError } from "@/lib/shiprocket";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const approveOverrideSchema = z.object({
  reviewNote: z.string().optional(),
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
    const body = await req.json().catch(() => ({}));

    const parsed = approveOverrideSchema.safeParse(body);
    const adminProfile = adminCheck.context?.profile;

    const updatedOrder = await approveEmergencyOverride(
      orderId,
      String(adminProfile?._id || "manager"),
      adminProfile?.email || "manager@niyat.in",
      parsed.success ? parsed.data.reviewNote : undefined
    );

    return apiSuccess({
      orderNumber: updatedOrder.orderNumber,
      shipmentState: updatedOrder.shipment?.shipmentState,
      message: "Emergency override approved. Courier reassignment is now unblocked.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to approve override";
    const status = error instanceof ShiprocketValidationError ? error.statusCode : 403;
    return apiError("OVERRIDE_APPROVAL_FAILED", msg, status);
  }
}
