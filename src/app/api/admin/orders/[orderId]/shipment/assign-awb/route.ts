import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { assignAwb } from "@/lib/shiprocket";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const assignAwbSchema = z.object({
  courierCompanyId: z.number().int().positive("A valid courier company ID is required"),
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

    const parsed = assignAwbSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid courier ID", 400);
    }

    const updatedOrder = await assignAwb(orderId, parsed.data.courierCompanyId);

    return apiSuccess({
      orderNumber: updatedOrder.orderNumber,
      awbCode: updatedOrder.shipment?.awbCode,
      courierName: updatedOrder.shipment?.courierName,
      shipment: updatedOrder.shipment,
      message: `AWB ${updatedOrder.shipment?.awbCode} assigned via ${updatedOrder.shipment?.courierName}`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to assign AWB";
    return apiError("AWB_ASSIGNMENT_FAILED", msg, 400);
  }
}

