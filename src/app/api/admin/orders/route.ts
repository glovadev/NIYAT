import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const fulfilmentStatus = searchParams.get("fulfilmentStatus");
    const paymentStatus = searchParams.get("paymentStatus");
    const paymentMethod = searchParams.get("paymentMethod");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    if (fulfilmentStatus && fulfilmentStatus !== "ALL") {
      query.fulfilmentStatus = fulfilmentStatus;
    }
    if (paymentStatus && paymentStatus !== "ALL") {
      query.paymentStatus = paymentStatus;
    }
    if (paymentMethod && paymentMethod !== "ALL") {
      query.paymentMethod = paymentMethod;
    }
    if (q) {
      query.$or = [
        { orderNumber: { $regex: q, $options: "i" } },
        { "customer.name": { $regex: q, $options: "i" } },
        { "customer.phone": { $regex: q, $options: "i" } },
        { "customer.email": { $regex: q, $options: "i" } },
      ];
    }

    const totalItems = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return apiSuccess({
      items: orders.map((o) => ({
        id: String(o._id),
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        customerName: o.customer.name,
        customerPhone: o.customer.phone,
        customerEmail: o.customer.email,
        itemCount: (o.items || []).reduce((sum, item) => sum + item.quantity, 0),
        totalPaise: o.totalPaise,
        currency: o.currency,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        fulfilmentStatus: o.fulfilmentStatus,
        carrier: o.shipment?.carrier || null,
        trackingNumber: o.shipment?.trackingNumber || null,
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load admin orders";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
