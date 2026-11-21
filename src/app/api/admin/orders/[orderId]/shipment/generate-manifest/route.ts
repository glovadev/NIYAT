import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { generateManifest } from "@/lib/shiprocket";
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

    const updatedOrder = await generateManifest(orderId);

    return apiSuccess({
      orderNumber: updatedOrder.orderNumber,
      manifestUrl: updatedOrder.shipment?.manifestUrl,
      shipment: updatedOrder.shipment,
      message: "Manifest generated successfully - order is ready for courier handover",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to generate manifest";
    return apiError("MANIFEST_GENERATION_FAILED", msg, 400);
  }
}

