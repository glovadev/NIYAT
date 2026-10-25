import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatPaise, calculateDiscountPercent, cn } from "../lib/utils";

describe("Utility Functions Unit Tests", () => {
  describe("formatPaise()", () => {
    test("formats standard rupee values correctly without decimals", () => {
      assert.strictEqual(formatPaise(29900), "₹299");
      assert.strictEqual(formatPaise(49900), "₹499");
      assert.strictEqual(formatPaise(99900), "₹999");
    });

    test("formats rupee values with decimals when showDecimals is true", () => {
      assert.strictEqual(formatPaise(29950, true), "₹299.50");
      assert.strictEqual(formatPaise(0, true), "₹0.00");
    });

    test("handles zero paise", () => {
      assert.strictEqual(formatPaise(0), "₹0");
    });

    test("formats large order amounts correctly with Indian numbering system", () => {
      // 1,00,000 paise = ₹1,000
      assert.strictEqual(formatPaise(100000), "₹1,000");
      // 1,00,00,000 paise = ₹1,00,000
      assert.strictEqual(formatPaise(10000000), "₹1,00,000");
    });
  });

  describe("calculateDiscountPercent()", () => {
    test("calculates accurate discount percentage", () => {
      // ₹1000 down to ₹750 = 25%
      assert.strictEqual(calculateDiscountPercent(100000, 75000), 25);
      // ₹500 down to ₹250 = 50%
      assert.strictEqual(calculateDiscountPercent(50000, 25000), 50);
      // ₹1000 down to ₹800 = 20%
      assert.strictEqual(calculateDiscountPercent(100000, 80000), 20);
    });

    test("returns 0 when sale price equals regular price", () => {
      assert.strictEqual(calculateDiscountPercent(49900, 49900), 0);
    });

    test("returns 0 when sale price is higher than regular price", () => {
      assert.strictEqual(calculateDiscountPercent(49900, 59900), 0);
    });

    test("returns 0 for negative or zero regular price", () => {
      assert.strictEqual(calculateDiscountPercent(0, 100), 0);
      assert.strictEqual(calculateDiscountPercent(-500, 100), 0);
    });
  });

  describe("cn() classnames utility", () => {
    test("combines multiple class names", () => {
      assert.strictEqual(cn("px-4", "py-2"), "px-4 py-2");
    });

    test("handles conditional class values correctly", () => {
      const isPrimary = true;
      const isLarge = false;
      assert.strictEqual(
        cn("btn", isPrimary && "btn-primary", isLarge && "btn-lg"),
        "btn btn-primary"
      );
    });

    test("merges tailwind classes using tailwind-merge to avoid conflicts", () => {
      assert.strictEqual(cn("p-4", "p-6"), "p-6");
      assert.strictEqual(cn("text-red-500", "text-blue-500"), "text-blue-500");
    });
  });
});
