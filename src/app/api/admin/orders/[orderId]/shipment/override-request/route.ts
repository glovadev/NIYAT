import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { requestEmergencyOverride } from "@/lib/shiprocket";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const overrideRequestSchema = z.object({
  reason: z.string().min(5, "A justification reason of at least 5 characters is required"),
  evidenceReference: z.string().min(3, "An evidence reference (e.g. ticket ID or email thread) is required"),
  targetCancellationId: z.string().optional(),
  reviewIncidentId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { orderId } = await params;
    const body = await req.json();

    const parsed = overrideRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid payload", 400);
    }

    const adminProfile = adminCheck.context?.profile;
    const updatedOrder = await requestEmergencyOverride(
      orderId,
      String(adminProfile?._id || "staff"),
      adminProfile?.email || "staff@niyat.in",
      parsed.data.reason,
      parsed.data.evidenceReference,
      parsed.data.targetCancellationId,
      parsed.data.reviewIncidentId
    );

    return apiSuccess({
      orderNumber: updatedOrder.orderNumber,
      overrideRequest: updatedOrder.shipment?.overrideRequest,
      message: "Emergency override request submitted for managerial review (two-person rule)",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to submit override request";
    return apiError("OVERRIDE_REQUEST_FAILED", msg, 400);
  }
}

