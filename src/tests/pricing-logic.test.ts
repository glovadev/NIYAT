import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Pure pricing & checkout calculation helpers
 */
export function calculateLineTotal(unitPricePaise: number, quantity: number): number {
  if (unitPricePaise < 0 || quantity <= 0) return 0;
  return Math.round(unitPricePaise * quantity);
}

export function calculateShippingFee(subtotalPaise: number, thresholdPaise = 49900, standardShippingPaise = 7000): number {
  if (subtotalPaise >= thresholdPaise || subtotalPaise === 0) {
    return 0; // Free shipping
  }
  return standardShippingPaise;
}

export function calculateCouponDiscount(
  eligibleSubtotalPaise: number,
  type: "PERCENTAGE" | "FIXED",
  value: number, // percentage points (e.g. 10 for 10%) or fixed paise (e.g. 10000 for ₹100)
  maxDiscountPaise?: number,
  minOrderPaise = 0
): number {
  if (eligibleSubtotalPaise < minOrderPaise) {
    return 0;
  }

  let discount = 0;
  if (type === "PERCENTAGE") {
    discount = Math.round((eligibleSubtotalPaise * value) / 100);
    if (maxDiscountPaise && discount > maxDiscountPaise) {
      discount = maxDiscountPaise;
    }
  } else if (type === "FIXED") {
    discount = Math.min(value, eligibleSubtotalPaise);
  }

  return Math.max(0, discount);
}

export function calculateOrderTotals(params: {
  items: Array<{ unitPricePaise: number; quantity: number }>;
  couponDiscountPaise?: number;
  shippingThresholdPaise?: number;
  standardShippingPaise?: number;
}) {
  const subtotalPaise = params.items.reduce(
    (sum, item) => sum + calculateLineTotal(item.unitPricePaise, item.quantity),
    0
  );

  const discountPaise = Math.min(params.couponDiscountPaise || 0, subtotalPaise);
  const afterDiscountSubtotal = Math.max(0, subtotalPaise - discountPaise);

  const shippingFeePaise = calculateShippingFee(
    subtotalPaise,
    params.shippingThresholdPaise ?? 49900,
    params.standardShippingPaise ?? 7000
  );

  const grandTotalPaise = afterDiscountSubtotal + shippingFeePaise;

  return {
    subtotalPaise,
    discountPaise,
    shippingFeePaise,
    grandTotalPaise,
  };
}

describe("E-Commerce Pricing & Calculation Unit Tests", () => {
  describe("calculateLineTotal()", () => {
    test("calculates line total for items correctly", () => {
      // 1 item of ₹399 = ₹399
      assert.strictEqual(calculateLineTotal(39900, 1), 39900);
      // 3 items of ₹299 = ₹897
      assert.strictEqual(calculateLineTotal(29900, 3), 89700);
    });

    test("handles zero or invalid quantity gracefully", () => {
      assert.strictEqual(calculateLineTotal(39900, 0), 0);
      assert.strictEqual(calculateLineTotal(39900, -2), 0);
    });
  });

  describe("calculateShippingFee()", () => {
    test("charges standard delivery fee below free shipping threshold (₹499)", () => {
      // Order of ₹399 (< ₹499) -> charges ₹70
      assert.strictEqual(calculateShippingFee(39900, 49900, 7000), 7000);
      // Order of ₹299 (< ₹499) -> charges ₹70
      assert.strictEqual(calculateShippingFee(29900, 49900, 7000), 7000);
    });

    test("grants FREE shipping for orders equal to or above ₹499", () => {
      // Exactly ₹499 -> Free shipping (₹0)
      assert.strictEqual(calculateShippingFee(49900, 49900, 7000), 0);
      // ₹799 (> ₹499) -> Free shipping (₹0)
      assert.strictEqual(calculateShippingFee(79900, 49900, 7000), 0);
    });

    test("returns 0 fee for empty carts", () => {
      assert.strictEqual(calculateShippingFee(0), 0);
    });
  });

  describe("calculateCouponDiscount()", () => {
    test("calculates percentage discount accurately (e.g. NIYAT10 = 10% off)", () => {
      // 10% off on ₹1000 order = ₹100
      assert.strictEqual(
        calculateCouponDiscount(100000, "PERCENTAGE", 10),
        10000
      );
      // 20% off on ₹500 order = ₹100
      assert.strictEqual(
        calculateCouponDiscount(50000, "PERCENTAGE", 20),
        10000
      );
    });

    test("caps percentage discount when maxDiscountPaise is defined", () => {
      // 50% off on ₹2000 order = ₹1000, but capped at ₹300 (30000 paise)
      assert.strictEqual(
        calculateCouponDiscount(200000, "PERCENTAGE", 50, 30000),
        30000
      );
    });

    test("calculates fixed amount discount accurately", () => {
      // ₹150 off on ₹800 order = ₹150
      assert.strictEqual(
        calculateCouponDiscount(80000, "FIXED", 15000),
        15000
      );
      // Fixed discount cannot exceed cart total
      assert.strictEqual(
        calculateCouponDiscount(10000, "FIXED", 15000),
        10000
      );
    });

    test("rejects discount when subtotal is below minimum order value", () => {
      // Minimum order of ₹500, but cart is only ₹400
      assert.strictEqual(
        calculateCouponDiscount(40000, "PERCENTAGE", 10, undefined, 50000),
        0
      );
    });
  });

  describe("calculateOrderTotals()", () => {
    test("calculates complete order breakdown with shipping fee and coupon", () => {
      // Order: 1x Face Wash (₹399) -> subtotal ₹399
      // Shipping: ₹70 (below ₹499)
      // Grand Total: ₹399 + ₹70 = ₹469
      const result = calculateOrderTotals({
        items: [{ unitPricePaise: 39900, quantity: 1 }],
      });

      assert.strictEqual(result.subtotalPaise, 39900);
      assert.strictEqual(result.discountPaise, 0);
      assert.strictEqual(result.shippingFeePaise, 7000);
      assert.strictEqual(result.grandTotalPaise, 46900);
    });

    test("applies free shipping and coupon discount correctly for high-value orders", () => {
      // Order: 2x Serum (₹799 each = ₹1598)
      // Coupon: ₹200 off (20000 paise)
      // Shipping: ₹0 (subtotal ₹1598 > ₹499)
      // Grand Total: ₹1598 - ₹200 = ₹1398 (139800 paise)
      const result = calculateOrderTotals({
        items: [{ unitPricePaise: 79900, quantity: 2 }],
        couponDiscountPaise: 20000,
      });

      assert.strictEqual(result.subtotalPaise, 159800);
      assert.strictEqual(result.discountPaise, 20000);
      assert.strictEqual(result.shippingFeePaise, 0);
      assert.strictEqual(result.grandTotalPaise, 139800);
    });
  });
});
