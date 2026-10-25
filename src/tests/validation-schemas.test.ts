import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// Core Validation Schemas
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number");

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit Indian PIN code");

export const addressSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  phone: phoneSchema,
  streetAddress: z.string().min(5, "Address must be at least 5 characters").max(200),
  city: z.string().min(2, "City is required").max(60),
  state: z.string().min(2, "State is required").max(60),
  pincode: pincodeSchema,
});

export const checkoutItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive("Quantity must be greater than zero"),
});

export const couponCodeSchema = z
  .string()
  .trim()
  .min(3, "Coupon code must be at least 3 characters")
  .max(30)
  .regex(/^[A-Z0-9_-]+$/i, "Coupon code must contain only letters, numbers, and dashes");

export const productImageSchema = z.object({
  url: z.string().min(1, "Image URL or path is required"),
  publicId: z.string().default("local_upload"),
  alt: z.string().default(""),
  sortOrder: z.number().default(0),
});

describe("Validation Schemas Unit Tests", () => {
  describe("productImageSchema", () => {
    test("accepts local uploaded relative image paths", () => {
      assert.strictEqual(
        productImageSchema.safeParse({
          url: "/uploads/products/1792834691319_whatsapp_image_2026_10_13_at_11_0.jpeg",
          publicId: "local_upload",
          alt: "NIYAT Cream",
        }).success,
        true
      );
      assert.strictEqual(
        productImageSchema.safeParse({
          url: "/images/hero-cream.webp",
        }).success,
        true
      );
    });

    test("accepts external absolute image URLs", () => {
      assert.strictEqual(
        productImageSchema.safeParse({
          url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be",
          publicId: "unsplash_1",
          alt: "Unsplash Cream",
        }).success,
        true
      );
    });

    test("rejects empty image path or URL", () => {
      assert.strictEqual(
        productImageSchema.safeParse({
          url: "",
        }).success,
        false
      );
    });
  });
  describe("phoneSchema", () => {
    test("accepts valid 10-digit Indian mobile numbers", () => {
      assert.strictEqual(phoneSchema.safeParse("9876543210").success, true);
      assert.strictEqual(phoneSchema.safeParse("7890123456").success, true);
      assert.strictEqual(phoneSchema.safeParse("6123456789").success, true);
    });

    test("rejects invalid phone numbers", () => {
      // Starts with 0, 1, 2, etc.
      assert.strictEqual(phoneSchema.safeParse("1234567890").success, false);
      // Less than 10 digits
      assert.strictEqual(phoneSchema.safeParse("98765").success, false);
      // More than 10 digits
      assert.strictEqual(phoneSchema.safeParse("9876543210123").success, false);
      // Contains letters
      assert.strictEqual(phoneSchema.safeParse("98765abcde").success, false);
    });
  });

  describe("pincodeSchema", () => {
    test("accepts valid 6-digit Indian postal codes", () => {
      assert.strictEqual(pincodeSchema.safeParse("110001").success, true); // New Delhi
      assert.strictEqual(pincodeSchema.safeParse("400001").success, true); // Mumbai
      assert.strictEqual(pincodeSchema.safeParse("560001").success, true); // Bengaluru
    });

    test("rejects invalid pincodes", () => {
      // Starts with 0
      assert.strictEqual(pincodeSchema.safeParse("012345").success, false);
      // Wrong length
      assert.strictEqual(pincodeSchema.safeParse("1100").success, false);
      assert.strictEqual(pincodeSchema.safeParse("1100001").success, false);
      // Alphanumeric
      assert.strictEqual(pincodeSchema.safeParse("1100AA").success, false);
    });
  });

  describe("addressSchema", () => {
    test("validates full customer shipping address", () => {
      const validAddress = {
        fullName: "Aarav Sharma",
        phone: "9876543210",
        streetAddress: "123 Sanctuary Greens, Sector 45",
        city: "Gurugram",
        state: "Haryana",
        pincode: "122003",
      };
      assert.strictEqual(addressSchema.safeParse(validAddress).success, true);
    });

    test("rejects address with incomplete fields", () => {
      const invalidAddress = {
        fullName: "A", // too short
        phone: "123", // invalid
        streetAddress: "",
        city: "",
        state: "",
        pincode: "000000",
      };
      const result = addressSchema.safeParse(invalidAddress);
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.errors.length >= 4);
      }
    });
  });

  describe("checkoutItemSchema", () => {
    test("validates cart item with positive integer quantity", () => {
      assert.strictEqual(
        checkoutItemSchema.safeParse({ productId: "prod_01", quantity: 2 }).success,
        true
      );
    });

    test("rejects non-positive, fractional, or zero quantities", () => {
      assert.strictEqual(
        checkoutItemSchema.safeParse({ productId: "prod_01", quantity: 0 }).success,
        false
      );
      assert.strictEqual(
        checkoutItemSchema.safeParse({ productId: "prod_01", quantity: -1 }).success,
        false
      );
      assert.strictEqual(
        checkoutItemSchema.safeParse({ productId: "prod_01", quantity: 1.5 }).success,
        false
      );
    });
  });

  describe("couponCodeSchema", () => {
    test("accepts standard coupon codes", () => {
      assert.strictEqual(couponCodeSchema.safeParse("NIYAT10").success, true);
      assert.strictEqual(couponCodeSchema.safeParse("WELCOME-2026").success, true);
      assert.strictEqual(couponCodeSchema.safeParse("GLOW_50").success, true);
    });

    test("rejects coupon codes with special characters or invalid length", () => {
      assert.strictEqual(couponCodeSchema.safeParse("N").success, false); // too short
      assert.strictEqual(couponCodeSchema.safeParse("CODE#123").success, false); // invalid character
    });
  });
});
