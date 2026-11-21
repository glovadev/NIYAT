import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { scheduleCourierPickup } from "@/lib/shiprocket";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schedulePickupSchema = z.object({
  pickupDate: z.string().optional(),
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

    const parsed = schedulePickupSchema.safeParse(body);
    const updatedOrder = await scheduleCourierPickup(orderId, parsed.success ? parsed.data.pickupDate : undefined);

    return apiSuccess({
      orderNumber: updatedOrder.orderNumber,
      pickupTokenNumber: updatedOrder.shipment?.pickupTokenNumber,
      pickupScheduledDate: updatedOrder.shipment?.pickupScheduledDate,
      shipment: updatedOrder.shipment,
      message: `Pickup scheduled successfully (Token: ${updatedOrder.shipment?.pickupTokenNumber || "N/A"})`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to schedule pickup";
    return apiError("PICKUP_SCHEDULING_FAILED", msg, 400);
  }
}

