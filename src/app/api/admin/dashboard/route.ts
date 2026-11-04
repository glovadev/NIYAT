import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) {
      return adminCheck.response!;
    }

    await connectToDatabase();

    const [
      totalOrders,
      paidOrdersAggregate,
      pendingFulfilmentCount,
      lowStockCount,
      recentOrders,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { paymentStatus: "PAID" } },
        { $group: { _id: null, totalRevenue: { $sum: "$totalPaise" } } },
      ]),
      Order.countDocuments({
        fulfilmentStatus: { $in: ["CONFIRMED", "PROCESSING", "PACKED"] },
      }),
      Product.countDocuments({
        status: "PUBLISHED",
        $expr: { $lte: ["$stockQuantity", "$lowStockThreshold"] },
      }),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const totalRevenuePaise = paidOrdersAggregate[0]?.totalRevenue || 0;

    return apiSuccess({
      metrics: {
        totalOrders,
        totalRevenuePaise,
        pendingFulfilmentCount,
        lowStockCount,
      },
      recentOrders: recentOrders.map((o) => ({
        id: String(o._id),
        orderNumber: o.orderNumber,
        customerName: o.customer?.name || "Customer",
        customerPhone: o.customer?.phone || "N/A",
        totalPaise: o.totalPaise,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        fulfilmentStatus: o.fulfilmentStatus,
        createdAt: o.createdAt,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load admin dashboard metrics";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
