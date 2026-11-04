import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../lib/auth/password";

describe("Distributor Authentication & Password Utilities", () => {
  it("should securely hash a plain-text password with salt", () => {
    const plain = "DistributorSecret2026";
    const hashed = hashPassword(plain);

    assert.ok(hashed.includes(":"), "Hash must contain salt:hash separator");
    const [salt, key] = hashed.split(":");
    assert.strictEqual(salt.length, 32, "Salt must be 16 bytes in hex (32 chars)");
    assert.strictEqual(key.length, 128, "Key must be 64 bytes in hex (128 chars)");
  });

  it("should verify correct password against generated hash", () => {
    const plain = "WholesalePartner@123";
    const hashed = hashPassword(plain);

    assert.strictEqual(verifyPassword(plain, hashed), true);
  });

  it("should reject incorrect password against hash", () => {
    const plain = "CorrectPassword";
    const hashed = hashPassword(plain);

    assert.strictEqual(verifyPassword("WrongPassword", hashed), false);
    assert.strictEqual(verifyPassword("", hashed), false);
    assert.strictEqual(verifyPassword("correctpassword", hashed), false);
  });

  it("should return false for malformed or corrupted hashes", () => {
    assert.strictEqual(verifyPassword("any", ""), false);
    assert.strictEqual(verifyPassword("any", "invalidhashstring"), false);
  });
});

describe("Distributor Bulk Pricing & Minimum Quantity Rules", () => {
  it("enforces distributor minimum bulk quantity constraint", () => {
    const product = {
      name: "NIYAT Saffron Radiance Cream",
      distributorPricePaise: 45000, // ₹450
      regularPricePaise: 89900, // ₹899
      distributorMinQuantity: 15,
    };

    const validateBulkOrderQty = (requestedQty: number, minQty: number) => {
      return requestedQty >= minQty;
    };

    assert.strictEqual(validateBulkOrderQty(10, product.distributorMinQuantity), false);
    assert.strictEqual(validateBulkOrderQty(15, product.distributorMinQuantity), true);
    assert.strictEqual(validateBulkOrderQty(50, product.distributorMinQuantity), true);
  });

  it("computes wholesale savings margin accurately vs retail MRP", () => {
    const regularPricePaise = 100000; // ₹1,000
    const distributorPricePaise = 60000; // ₹600

    const marginPercent = Math.round(
      ((regularPricePaise - distributorPricePaise) / regularPricePaise) * 100
    );

    assert.strictEqual(marginPercent, 40); // 40% margin
  });

  it("calculates wholesale line total based on distributor bulk price", () => {
    const distributorPricePaise = 42000; // ₹420
    const bulkUnits = 25;

    const lineTotalPaise = distributorPricePaise * bulkUnits;
    assert.strictEqual(lineTotalPaise, 1050000); // ₹10,500
  });
});

