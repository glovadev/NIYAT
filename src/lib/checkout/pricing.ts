import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { Coupon, ICoupon } from "@/models/Coupon";
import { SiteSettings } from "@/models/SiteSettings";
import mongoose from "mongoose";

export interface CartInputItem {
  productId: string;
  quantity: number;
}

export interface QuotedItem {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  sizeLabel: string;
  imageUrl?: string;
  unitPricePaise: number;
  regularPricePaise: number;
  salePricePaise?: number | null;
  quantity: number;
  lineTotalPaise: number;
  inStock: boolean;
  stockAvailable: number;
}

export interface CartQuote {
  items: QuotedItem[];
  subtotalPaise: number;
  discountPaise: number;
  shippingFeePaise: number;
  taxPaise: number;
  grandTotalPaise: number;
  currency: "INR";
  appliedCoupon?: {
    code: string;
    discountPaise: number;
    type: "FIXED" | "PERCENTAGE";
  } | null;
  couponError?: string;
  warnings: string[];
  isEligibleForCheckout: boolean;
}

export async function calculateCartQuote(
  items: CartInputItem[],
  couponCode?: string,
  _customerId?: string
): Promise<CartQuote> {
  await connectToDatabase();

  const warnings: string[] = [];
  let isEligible = true;

  if (!items || items.length === 0) {
    return {
      items: [],
      subtotalPaise: 0,
      discountPaise: 0,
      shippingFeePaise: 0,
      taxPaise: 0,
      grandTotalPaise: 0,
      currency: "INR",
      warnings: ["Cart is empty"],
      isEligibleForCheckout: false,
    };
  }

  // Load site settings for shipping policies
  const settings = await SiteSettings.findOne({ key: "default" }).lean();
  const freeShippingThreshold = settings?.freeShippingThresholdPaise ?? 99900; // ₹999
  const standardShippingFee = settings?.standardShippingFeePaise ?? 9900; // ₹99
  const isFreeDeliveryOfferActive = settings?.isFreeDeliveryOfferActive ?? false;

  // Deduplicate and aggregate quantities by productId
  const aggregated = new Map<string, number>();
  for (const item of items) {
    if (!item.productId || !mongoose.Types.ObjectId.isValid(item.productId)) {
      continue;
    }
    const qty = Math.max(1, Math.min(10, Math.floor(item.quantity || 1)));
    aggregated.set(item.productId, (aggregated.get(item.productId) || 0) + qty);
  }

  const productIds = Array.from(aggregated.keys());
  const productDocs = await Product.find({
    _id: { $in: productIds },
    status: "PUBLISHED",
  }).lean();

  const productMap = new Map(productDocs.map((p) => [String(p._id), p]));

  const quotedItems: QuotedItem[] = [];
  let subtotalPaise = 0;

  for (const [prodId, qty] of aggregated.entries()) {
    const p = productMap.get(prodId);

    if (!p) {
      warnings.push(`One of the items in your cart is no longer available.`);
      isEligible = false;
      continue;
    }

    const effectivePrice = p.salePricePaise || p.regularPricePaise;
    const inStock = p.stockQuantity >= qty;

    if (!inStock) {
      warnings.push(
        `Insufficient stock for "${p.name}". Only ${p.stockQuantity} available.`
      );
      isEligible = false;
    }

    const lineTotal = effectivePrice * qty;
    subtotalPaise += lineTotal;

    quotedItems.push({
      productId: String(p._id),
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      sizeLabel: p.sizeLabel,
      imageUrl: p.images?.[0]?.url,
      unitPricePaise: effectivePrice,
      regularPricePaise: p.regularPricePaise,
      salePricePaise: p.salePricePaise,
      quantity: qty,
      lineTotalPaise: lineTotal,
      inStock,
      stockAvailable: p.stockQuantity,
    });
  }

  // Coupon evaluation
  let discountPaise = 0;
  let appliedCoupon: CartQuote["appliedCoupon"] = null;
  let couponError: string | undefined;

  if (couponCode && couponCode.trim()) {
    const code = couponCode.trim().toUpperCase();
    const now = new Date();

    const coupon = await Coupon.findOne({
      code,
      status: "ACTIVE",
      startsAt: { $lte: now },
      expiresAt: { $gte: now },
    });

    if (!coupon) {
      couponError = "Invalid or expired coupon code";
    } else if (subtotalPaise < coupon.minimumOrderPaise) {
      const minAmount = (coupon.minimumOrderPaise / 100).toFixed(0);
      couponError = `This coupon requires a minimum spend of ₹${minAmount}`;
    } else if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      couponError = "This coupon has reached its maximum redemptions";
    } else {
      // Calculate eligible subtotal if product restrictions exist
      let eligibleSubtotal = subtotalPaise;
      if (coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
        const allowedIds = new Set(coupon.applicableProductIds.map(String));
        eligibleSubtotal = quotedItems
          .filter((item) => allowedIds.has(item.productId))
          .reduce((sum, item) => sum + item.lineTotalPaise, 0);
      }

      if (eligibleSubtotal <= 0) {
        couponError = "Coupon is not applicable to any items in your cart";
      } else {
        if (coupon.type === "PERCENTAGE") {
          let calculated = Math.round((eligibleSubtotal * coupon.value) / 100);
          if (coupon.maximumDiscountPaise) {
            calculated = Math.min(calculated, coupon.maximumDiscountPaise);
          }
          discountPaise = calculated;
        } else {
          // FIXED discount in paise
          discountPaise = Math.min(coupon.value, eligibleSubtotal);
        }

        appliedCoupon = {
          code: coupon.code,
          discountPaise,
          type: coupon.type,
        };
      }
    }
  }

  // Shipping calculation
  const netSubtotal = Math.max(0, subtotalPaise - discountPaise);
  let shippingFeePaise = 0;
  if (
    quotedItems.length > 0 &&
    !isFreeDeliveryOfferActive &&
    standardShippingFee > 0 &&
    netSubtotal < freeShippingThreshold
  ) {
    shippingFeePaise = standardShippingFee;
  }

  // Tax breakdown (18% inclusive GST standard for cosmetics in India)
  const taxPaise = Math.round((netSubtotal * 18) / 118);

  const grandTotalPaise = netSubtotal + shippingFeePaise;

  if (quotedItems.length === 0) {
    isEligible = false;
  }

  return {
    items: quotedItems,
    subtotalPaise,
    discountPaise,
    shippingFeePaise,
    taxPaise,
    grandTotalPaise,
    currency: "INR",
    appliedCoupon,
    couponError,
    warnings,
    isEligibleForCheckout: isEligible && warnings.length === 0,
  };
}
