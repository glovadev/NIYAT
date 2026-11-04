import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { UserProfile } from "@/models/UserProfile";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    void UserProfile;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const fulfilmentStatus = searchParams.get("fulfilmentStatus");
    const paymentStatus = searchParams.get("paymentStatus");

    // Query all distributor orders
    const query: Record<string, any> = {
      $or: [
        { isDistributorOrder: true },
        { "orderNumber": { $regex: /^NIY-DIST-/, $options: "i" } },
      ],
    };

    if (fulfilmentStatus && fulfilmentStatus !== "ALL") {
      query.fulfilmentStatus = fulfilmentStatus;
    }
    if (paymentStatus && paymentStatus !== "ALL") {
      query.paymentStatus = paymentStatus;
    }

    if (q) {
      query.$and = [
        {
          $or: [
            { orderNumber: { $regex: q, $options: "i" } },
            { "customer.name": { $regex: q, $options: "i" } },
            { "customer.phone": { $regex: q, $options: "i" } },
            { "customer.email": { $regex: q, $options: "i" } },
            { "distributorInfo.companyName": { $regex: q, $options: "i" } },
            { "distributorInfo.gstNumber": { $regex: q, $options: "i" } },
            { "distributorInfo.poNumber": { $regex: q, $options: "i" } },
          ],
        },
      ];
    }

    const orders = await Order.find(query)
      .populate("userId", "name email phone companyName gstNumber")
      .sort({ createdAt: -1 })
      .lean();

    const items = orders.map((o) => {
      const user = o.userId as any;
      const companyName =
        o.distributorInfo?.companyName || user?.companyName || o.customer?.name || "Distributor";
      const gstNumber = o.distributorInfo?.gstNumber || user?.gstNumber || "";
      const poNumber = o.distributorInfo?.poNumber || "";

      return {
        id: String(o._id),
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        companyName,
        contactName: o.customer.name,
        contactPhone: o.customer.phone,
        contactEmail: o.customer.email,
        gstNumber,
        poNumber,
        itemsCount: (o.items || []).reduce((sum, item) => sum + item.quantity, 0),
        items: (o.items || []).map((i) => ({
          productId: String(i.productId),
          productName: i.productName,
          sku: i.sku,
          sizeLabel: i.sizeLabel,
          imageUrl: i.imageUrl,
          unitPricePaise: i.unitPricePaise,
          quantity: i.quantity,
          lineTotalPaise: i.lineTotalPaise,
        })),
        shippingAddress: o.shippingAddress,
        subtotalPaise: o.subtotalPaise,
        taxPaise: o.taxPaise,
        shippingPaise: o.shippingPaise,
        totalPaise: o.totalPaise,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        fulfilmentStatus: o.fulfilmentStatus,
        shipment: o.shipment || null,
        statusHistory: o.statusHistory || [],
      };
    });

    return apiSuccess({
      orders: items,
      totalCount: items.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load distributor orders";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

