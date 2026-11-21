import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { generateShippingLabel } from "@/lib/shiprocket";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { orderId } = await params;

    const updatedOrder = await generateShippingLabel(orderId);

    return apiSuccess({
      orderNumber: updatedOrder.orderNumber,
      labelUrl: updatedOrder.shipment?.labelUrl,
      shipment: updatedOrder.shipment,
      message: "Shipping label generated successfully",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to generate label";
    return apiError("LABEL_GENERATION_FAILED", msg, 400);
  }
}

