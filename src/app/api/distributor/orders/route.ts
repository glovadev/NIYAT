import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { InventoryMovement } from "@/models/InventoryMovement";
import { requireDistributor } from "@/lib/auth/distributor-guard";
import { apiSuccess, apiError } from "@/lib/api/response";
import mongoose from "mongoose";
import { z } from "zod";

export const dynamic = "force-dynamic";

const addressSchema = z.object({
  recipientName: z.string().min(2, "Recipient name is required").max(100),
  phone: z.string().min(10, "Valid phone number required").max(15),
  addressLine1: z.string().min(5, "Address line 1 is required").max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  postalCode: z.string().regex(/^\d{6}$/, "Must be a valid 6-digit Indian PIN code"),
  country: z.literal("IN").default("IN"),
});

const placeDistributorOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Order items cannot be empty"),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  paymentMethod: z.enum(["BANK_TRANSFER", "COD", "RAZORPAY"]).default("BANK_TRANSFER"),
  poNumber: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

function generateDistributorOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `NIY-DIST-${dateStr}-${randomSuffix}`;
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireDistributor(req);
    if (!authResult.authorized) return authResult.response!;

    const { profile } = authResult.context!;
    await connectToDatabase();

    const orders = await Order.find({
      userId: profile._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return apiSuccess({
      orders: orders.map((o) => ({
        id: String(o._id),
        orderNumber: o.orderNumber,
        itemsCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
        items: o.items,
        shippingAddress: o.shippingAddress,
        subtotalPaise: o.subtotalPaise,
        taxPaise: o.taxPaise,
        shippingPaise: o.shippingPaise,
        totalPaise: o.totalPaise,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        fulfilmentStatus: o.fulfilmentStatus,
        isDistributorOrder: o.isDistributorOrder,
        distributorInfo: o.distributorInfo,
        createdAt: o.createdAt,
      })),
      totalCount: orders.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load distributor orders";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireDistributor(req);
    if (!authResult.authorized) return authResult.response!;

    const { profile } = authResult.context!;
    const body = await req.json();

    const parsed = placeDistributorOrderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid bulk order submission",
        400
      );
    }

    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      poNumber,
      notes,
    } = parsed.data;

    await connectToDatabase();

    // Fetch all requested products
    const productIds = items.map((i) => i.productId);
    const dbProducts = await Product.find({
      _id: { $in: productIds },
      status: "PUBLISHED",
    });

    const productMap = new Map(dbProducts.map((p) => [String(p._id), p]));

    // Validation checks for each item (min bulk quantity + stock)
    const orderItemSnapshots = [];
    let calculatedSubtotalPaise = 0;

    for (const item of items) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) {
        return apiError(
          "PRODUCT_NOT_FOUND",
          `Product ID '${item.productId}' is not available or published.`,
          400
        );
      }

      const minQty = dbProduct.distributorMinQuantity || 10;
      if (item.quantity < minQty) {
        return apiError(
          "MIN_QUANTITY_NOT_MET",
          `'${dbProduct.name}' requires a minimum bulk quantity of ${minQty} units (you requested ${item.quantity}).`,
          400
        );
      }

      if (dbProduct.stockQuantity < item.quantity) {
        return apiError(
          "INSUFFICIENT_STOCK",
          `Insufficient stock for '${dbProduct.name}'. Available: ${dbProduct.stockQuantity}, Requested: ${item.quantity}.`,
          409
        );
      }

      const unitPricePaise =
        typeof dbProduct.distributorPricePaise === "number" && dbProduct.distributorPricePaise > 0
          ? dbProduct.distributorPricePaise
          : Math.round(dbProduct.regularPricePaise * 0.65);

      const lineTotalPaise = unitPricePaise * item.quantity;
      calculatedSubtotalPaise += lineTotalPaise;

      const primaryImage =
        dbProduct.images?.find((img) => img.sortOrder === 0) || dbProduct.images?.[0];

      orderItemSnapshots.push({
        productId: dbProduct._id,
        productName: dbProduct.name,
        sku: dbProduct.sku,
        sizeLabel: dbProduct.sizeLabel,
        imageUrl: primaryImage?.url,
        unitPricePaise,
        quantity: item.quantity,
        discountPaise: 0,
        lineTotalPaise,
      });
    }

    // Free shipping on wholesale orders
    const shippingPaise = 0;
    const taxPaise = 0; // wholesale prices include taxes or calculated per invoice
    const totalPaise = calculatedSubtotalPaise + shippingPaise + taxPaise;

    const orderNumber = generateDistributorOrderNumber();

    // Initial statuses for distributor orders
    const initialPaymentStatus =
      paymentMethod === "RAZORPAY"
        ? "PENDING"
        : paymentMethod === "BANK_TRANSFER"
        ? "PENDING"
        : "PENDING";

    const initialFulfilmentStatus = "CONFIRMED";

    const order = await Order.create({
      orderNumber,
      userId: profile._id,
      customer: {
        name: shippingAddress.recipientName,
        email: profile.email,
        phone: shippingAddress.phone,
      },
      items: orderItemSnapshots,
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
      subtotalPaise: calculatedSubtotalPaise,
      discountPaise: 0,
      shippingPaise,
      taxPaise,
      totalPaise,
      currency: "INR",
      paymentMethod,
      paymentStatus: initialPaymentStatus,
      fulfilmentStatus: initialFulfilmentStatus,
      isDistributorOrder: true,
      distributorInfo: {
        companyName: profile.companyName || shippingAddress.recipientName,
        gstNumber: profile.gstNumber,
        poNumber: poNumber || undefined,
      },
      statusHistory: [
        {
          type: "FULFILMENT",
          to: initialFulfilmentStatus,
          actorType: "CUSTOMER",
          actorId: String(profile._id),
          reason: `Distributor wholesale order submitted (${notes ? "Notes: " + notes : "Standard wholesale"})`,
          at: new Date(),
        },
      ],
    });

    // Deduct stock for all items and log movements
    for (const item of items) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stockQuantity: -item.quantity } }
      );

      await InventoryMovement.create({
        productId: new mongoose.Types.ObjectId(item.productId),
        quantityChange: -item.quantity,
        type: "SALE",
        reason: `Wholesale Distributor Order ${order.orderNumber}`,
        orderId: order._id,
        actorType: "SYSTEM",
        actorId: String(profile._id),
        idempotencyKey: `dist_ord_${order._id}_${item.productId}`,
      });
    }

    return apiSuccess(
      {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        totalPaise: order.totalPaise,
        itemsCount: orderItemSnapshots.reduce((acc, i) => acc + i.quantity, 0),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        fulfilmentStatus: order.fulfilmentStatus,
        message: "Wholesale order placed successfully!",
      },
      undefined,
      201
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to place distributor order";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

