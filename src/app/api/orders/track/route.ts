import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber")?.trim().toUpperCase();
    const phone = searchParams.get("phone")?.trim();

    if (!orderNumber || !phone) {
      return apiError(
        "VALIDATION_ERROR",
        "Both order number and phone number are required to track an order",
        400,
        [
          ...(!orderNumber ? [{ field: "orderNumber", issue: "Order number is required" }] : []),
          ...(!phone ? [{ field: "phone", issue: "Phone number is required" }] : []),
        ]
      );
    }

    // Clean phone number (strip spaces, dashes, +91 prefix for flexible matching)
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    if (normalizedPhone.length !== 10) {
      return apiError("VALIDATION_ERROR", "Please enter a valid 10-digit mobile number", 400, [
        { field: "phone", issue: "Must be a 10-digit Indian mobile number" },
      ]);
    }

    const order = await Order.findOne({ orderNumber }).lean();

    // Security rule: Never reveal if order exists with another phone number
    if (!order) {
      return apiError("ORDER_NOT_FOUND", "Order details not found. Please verify your order number and phone.", 404);
    }

    const orderCustomerPhone = (order.customer?.phone || "").replace(/\D/g, "").slice(-10);
    const shippingPhone = (order.shippingAddress?.phone || "").replace(/\D/g, "").slice(-10);

    if (orderCustomerPhone !== normalizedPhone && shippingPhone !== normalizedPhone) {
      return apiError("ORDER_NOT_FOUND", "Order details not found. Please verify your order number and phone.", 404);
    }

    // Return sanitized public tracking data
    const trackingData = {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      fulfilmentStatus: order.fulfilmentStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      items: (order.items || []).map((item) => ({
        name: item.productName,
        sizeLabel: item.sizeLabel,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
      })),
      destination: {
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
      },
      shipment: order.shipment
        ? {
            carrier: order.shipment.carrier || null,
            trackingNumber: order.shipment.trackingNumber || null,
            trackingUrl: order.shipment.trackingUrl || null,
            shippedAt: order.shipment.shippedAt || null,
            deliveredAt: order.shipment.deliveredAt || null,
          }
        : null,
      timeline: (order.statusHistory || [])
        .filter((h) => h.type === "FULFILMENT")
        .map((h) => ({
          status: h.to,
          at: h.at,
        })),
    };

    return apiSuccess(trackingData);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to track order";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
