import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { orderId } = await params;
    const order = await Order.findById(orderId).lean();

    if (!order) {
      return apiError("NOT_FOUND", "Order not found", 404);
    }

    return apiSuccess(order);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load order";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
