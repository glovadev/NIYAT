import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { apiSuccess, apiError } from "@/lib/api/response";
import { checkRateLimit, getTrustedClientIp } from "@/lib/security/rate-limiter";

export const dynamic = "force-dynamic";

/**
 * Validates and sanitizes public tracking URLs.
 * Rejects non-HTTP/HTTPS protocols (e.g. javascript:, data:, file:) to prevent XSS.
 */
function sanitizeTrackingUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    // 1. IP-Level Rate Limiting (Flood & DoS Defense)
    const clientIp = getTrustedClientIp(req);
    const ipCheck = checkRateLimit(`track_ip_${clientIp}`, 20, 60 * 1000); // 20 requests per minute per IP

    if (!ipCheck.success) {
      const errorResp = apiError(
        "RATE_LIMITED",
        "Too many tracking attempts from your network. Please wait a moment before trying again.",
        429
      );
      errorResp.headers.set("Retry-After", String(ipCheck.resetSeconds));
      return errorResp;
    }

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

    // Clean phone number (strip non-digits, take last 10 digits for flexible matching)
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    if (normalizedPhone.length !== 10) {
      return apiError("VALIDATION_ERROR", "Please enter a valid 10-digit mobile number", 400, [
        { field: "phone", issue: "Must be a 10-digit Indian mobile number" },
      ]);
    }

    // 2. Multi-Dimensional Rate Limiting (Brute-Force & Enumeration Defense)
    // Limits attempts by target order and target phone so rotating IP / spoofed headers cannot bypass rate limits
    const orderCheck = checkRateLimit(`track_order_${orderNumber}`, 10, 60 * 1000); // 10 attempts per minute per order
    const phoneCheck = checkRateLimit(`track_phone_${normalizedPhone}`, 10, 60 * 1000); // 10 attempts per minute per phone

    if (!orderCheck.success || !phoneCheck.success) {
      const resetSeconds = Math.max(orderCheck.resetSeconds, phoneCheck.resetSeconds);
      const errorResp = apiError(
        "RATE_LIMITED",
        "Too many tracking attempts for this order. Please wait a moment before trying again.",
        429
      );
      errorResp.headers.set("Retry-After", String(resetSeconds));
      return errorResp;
    }

    await connectToDatabase();

    const order = await Order.findOne({ orderNumber }).lean();

    // Security Rule: Identical generic error if order does not exist or phone does not match
    // to prevent user account/order existence enumeration.
    if (!order) {
      return apiError("ORDER_NOT_FOUND", "Order details not found. Please verify your order number and phone.", 404);
    }

    const orderCustomerPhone = (order.customer?.phone || "").replace(/\D/g, "").slice(-10);
    const shippingPhone = (order.shippingAddress?.phone || "").replace(/\D/g, "").slice(-10);

    if (orderCustomerPhone !== normalizedPhone && shippingPhone !== normalizedPhone) {
      return apiError("ORDER_NOT_FOUND", "Order details not found. Please verify your order number and phone.", 404);
    }

    // Sort tracking activities in reverse chronological order (most recent scan first)
    const rawActivities = Array.isArray(order.shipment?.trackingActivities)
      ? [...order.shipment.trackingActivities]
      : [];
    const sortedActivities = rawActivities.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });

    // Sanitize tracking URL
    const rawTrackingUrl = order.shipment?.trackingUrl;
    const sanitizedUrl =
      sanitizeTrackingUrl(rawTrackingUrl) ||
      (order.shipment?.awbCode
        ? `https://shiprocket.co/tracking/${encodeURIComponent(order.shipment.awbCode)}`
        : null);

    // Return strictly sanitized public tracking data
    // NEVER expose payment credentials, internal review notes, admin identities, or raw provider payloads
    const trackingData = {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      fulfilmentStatus: order.fulfilmentStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      items: (order.items || []).map((item) => ({
        name: (item as any).productName || (item as any).name || "Luxury Formulation",
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
            carrier: order.shipment.courierName || order.shipment.carrier || null,
            courierName: order.shipment.courierName || order.shipment.carrier || null,
            trackingNumber: order.shipment.awbCode || order.shipment.trackingNumber || null,
            awbCode: order.shipment.awbCode || order.shipment.trackingNumber || null,
            trackingUrl: sanitizedUrl,
            currentShippingStatus: order.shipment.currentShippingStatus || null,
            estimatedDeliveryDate: order.shipment.estimatedDeliveryDate || null,
            shippedAt: order.shipment.shippedAt || null,
            deliveredAt: order.shipment.deliveredAt || null,
            activities: sortedActivities.map((a) => ({
              date: a.date,
              status: a.status,
              activity: a.activity,
              location: a.location,
              srStatusCode: a.srStatusCode,
            })),
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
