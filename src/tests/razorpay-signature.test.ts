import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

/**
 * Validates Razorpay Payment Signature using HMAC-SHA256
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secretKey: string
): boolean {
  if (!orderId || !paymentId || !signature || !secretKey) {
    return false;
  }
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(body)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(signature, "utf-8")
    );
  } catch {
    return false;
  }
}

describe("Razorpay Signature Verification Unit Tests", () => {
  const secretKey = "test_key_secret_niyat_luxury";
  const orderId = "order_Niy123456789";
  const paymentId = "pay_Niy987654321";

  test("successfully verifies an authentic Razorpay signature", () => {
    // Generate valid signature using HMAC SHA256
    const payload = `${orderId}|${paymentId}`;
    const validSignature = crypto
      .createHmac("sha256", secretKey)
      .update(payload)
      .digest("hex");

    const isValid = verifyRazorpaySignature(
      orderId,
      paymentId,
      validSignature,
      secretKey
    );
    assert.strictEqual(isValid, true);
  });

  test("rejects tampered or fraudulent payment ID", () => {
    const payload = `${orderId}|${paymentId}`;
    const validSignature = crypto
      .createHmac("sha256", secretKey)
      .update(payload)
      .digest("hex");

    const isTampered = verifyRazorpaySignature(
      orderId,
      "pay_TAMPERED_FRAUD_ID",
      validSignature,
      secretKey
    );
    assert.strictEqual(isTampered, false);
  });

  test("rejects tampered signature string", () => {
    const fakeSignature = "d7a8fbb307d7809469ca933b02d82941d3f7d9aa8b9";
    const isValid = verifyRazorpaySignature(
      orderId,
      paymentId,
      fakeSignature,
      secretKey
    );
    assert.strictEqual(isValid, false);
  });

  test("rejects empty or missing parameters", () => {
    assert.strictEqual(
      verifyRazorpaySignature("", paymentId, "sig", secretKey),
      false
    );
    assert.strictEqual(
      verifyRazorpaySignature(orderId, "", "sig", secretKey),
      false
    );
    assert.strictEqual(
      verifyRazorpaySignature(orderId, paymentId, "", secretKey),
      false
    );
    assert.strictEqual(
      verifyRazorpaySignature(orderId, paymentId, "sig", ""),
      false
    );
  });

  test("verifies authentic signature with configured test secret key", () => {
    const configuredSecret = "AyDjzVkNWcrUWEreEnhFWl0s";
    const testOrderId = "order_test_123456";
    const testPaymentId = "pay_test_987654";
    const payload = `${testOrderId}|${testPaymentId}`;

    const expectedSignature = crypto
      .createHmac("sha256", configuredSecret)
      .update(payload)
      .digest("hex");

    assert.strictEqual(
      verifyRazorpaySignature(
        testOrderId,
        testPaymentId,
        expectedSignature,
        configuredSecret
      ),
      true
    );
  });
});
