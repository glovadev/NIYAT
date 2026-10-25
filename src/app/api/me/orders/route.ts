import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { Order } from "@/models/Order";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return apiError("UNAUTHENTICATED", "Please log in to view your orders", 401);
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId: auth.profile._id };
    if (status) {
      query.fulfilmentStatus = status;
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
        totalPaise: o.totalPaise,
        currency: o.currency,
        fulfilmentStatus: o.fulfilmentStatus,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        itemCount: (o.items || []).reduce((sum, item) => sum + item.quantity, 0),
        firstItem: o.items?.[0]
          ? {
              name: o.items[0].productName,
              imageUrl: o.items[0].imageUrl,
              sizeLabel: o.items[0].sizeLabel,
            }
          : null,
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
    const msg = error instanceof Error ? error.message : "Failed to load customer orders";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
