import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { reconcileShipment, adminForceResetShipment } from "@/lib/shiprocket";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reconcileSchema = z.object({
  forceReset: z.boolean().optional(),
  reason: z.string().min(5).optional(),
  confirmRemoteAbsence: z.boolean().optional(),
  evidenceReference: z.string().min(3).optional(),
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
    const body = await req.json().catch(() => ({}));

    const parsed = reconcileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid payload", 400);
    }

    // 1. Manual Force Reset requested by admin (Restricted to full ADMIN role)
    if (parsed.data.forceReset) {
      if (adminCheck.context?.profile?.role !== "ADMIN") {
        return apiError("FORBIDDEN", "Only administrators with ADMIN role can perform a manual force-reset", 403);
      }

      if (!parsed.data.reason) {
        return apiError("VALIDATION_ERROR", "A reason is mandatory for administrative force-reset", 400);
      }

      const adminProfile = adminCheck.context?.profile;
      const updatedOrder = await adminForceResetShipment(
        orderId,
        String(adminProfile?._id || "admin"),
        adminProfile?.email || "admin@niyat.in",
        parsed.data.reason,
        {
          confirmRemoteAbsence: parsed.data.confirmRemoteAbsence,
          evidenceReference: parsed.data.evidenceReference,
        }
      );

      return apiSuccess({
        orderNumber: updatedOrder.orderNumber,
        shipment: updatedOrder.shipment,
        message: "Shipment state force-reset to FAILED. You may re-initiate creation after checking Shiprocket.",
      });
    }

    // 2. Automated Remote Reconciliation
    const result = await reconcileShipment(orderId);

    return apiSuccess({
      orderNumber: result.orderNumber,
      reconciled: result.reconciled,
      previousState: result.previousState,
      newState: result.newState,
      shipment: result.order.shipment,
      message: result.message,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Reconciliation failed";
    return apiError("RECONCILIATION_ERROR", msg, 400);
  }
}

