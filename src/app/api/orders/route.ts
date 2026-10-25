import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { calculateCartQuote } from "@/lib/checkout/pricing";
import { Order } from "@/models/Order";
import { generateGuestOrderToken } from "@/lib/auth/guest-token";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const addressSchema = z.object({
  recipientName: z.string().min(2, "Recipient name must be at least 2 characters").max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number"),
  addressLine1: z.string().min(5, "Address line 1 must be at least 5 characters").max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  postalCode: z.string().regex(/^\d{6}$/, "Must be a valid 6-digit Indian PIN code"),
  country: z.literal("IN").default("IN"),
});

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Cart cannot be empty"),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  customerEmail: z.string().email().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["RAZORPAY", "COD"]).default("RAZORPAY"),
});

function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `NIY-${dateStr}-${randomSuffix}`;
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const auth = await getAuthenticatedUser(req);
    const body = await req.json();

    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid order details",
        400
      );
    }

    const {
      items,
      shippingAddress,
      billingAddress,
      customerEmail,
      couponCode,
      paymentMethod,
    } = parsed.data;

    // Server recalculates authoritative pricing quote
    const quote = await calculateCartQuote(
      items,
      couponCode,
      auth?.profile ? String(auth.profile._id) : undefined
    );

    if (!quote.isEligibleForCheckout) {
      return apiError(
        "ORDER_CREATION_FAILED",
        quote.warnings[0] || "Cannot place order with current cart items",
        409
      );
    }

    const orderNumber = generateOrderNumber();
    const effectiveEmail = customerEmail || auth?.profile.email;

    const initialPaymentStatus = paymentMethod === "COD" ? "PENDING" : "CREATED";
    const initialFulfilmentStatus =
      paymentMethod === "COD" ? "CONFIRMED" : "PENDING_PAYMENT";

    const order = await Order.create({
      orderNumber,
      userId: auth?.profile ? auth.profile._id : undefined,
      customer: {
        name: shippingAddress.recipientName,
        email: effectiveEmail,
        phone: shippingAddress.phone,
      },
      items: quote.items.map((i) => ({
        productId: i.productId,
        productName: i.name,
        sku: i.sku,
        sizeLabel: i.sizeLabel,
        imageUrl: i.imageUrl,
        unitPricePaise: i.unitPricePaise,
        quantity: i.quantity,
        discountPaise: 0,
        lineTotalPaise: i.lineTotalPaise,
      })),
      shippingAddress: {
        recipientName: shippingAddress.recipientName,
        phone: shippingAddress.phone,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: "IN",
      },
      billingAddress: billingAddress
        ? {
            recipientName: billingAddress.recipientName,
            phone: billingAddress.phone,
            addressLine1: billingAddress.addressLine1,
            addressLine2: billingAddress.addressLine2,
            city: billingAddress.city,
            state: billingAddress.state,
            postalCode: billingAddress.postalCode,
            country: "IN",
          }
        : undefined,
      subtotalPaise: quote.subtotalPaise,
      discountPaise: quote.discountPaise,
      shippingPaise: quote.shippingFeePaise,
      taxPaise: quote.taxPaise,
      totalPaise: quote.grandTotalPaise,
      currency: "INR",
      coupon: quote.appliedCoupon
        ? {
            code: quote.appliedCoupon.code,
            discountPaise: quote.appliedCoupon.discountPaise,
          }
        : undefined,
      paymentMethod,
      paymentStatus: initialPaymentStatus,
      fulfilmentStatus: initialFulfilmentStatus,
      statusHistory: [
        {
          type: "FULFILMENT",
          to: initialFulfilmentStatus,
          actorType: auth ? "CUSTOMER" : "SYSTEM",
          actorId: auth ? String(auth.profile._id) : undefined,
          reason: "Order created",
          at: new Date(),
        },
      ],
    });

    // If guest checkout, create signed guest token
    let guestOrderToken: string | undefined;
    if (!auth) {
      guestOrderToken = generateGuestOrderToken({
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        phone: shippingAddress.phone,
      });
    }

    return apiSuccess(
      {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        totalPaise: order.totalPaise,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        fulfilmentStatus: order.fulfilmentStatus,
        guestOrderToken,
      },
      undefined,
      201
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create order";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
