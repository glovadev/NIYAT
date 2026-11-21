import crypto from "crypto";

/**
 * Validates the Shiprocket webhook secret using constant-time comparison
 * and strict length pre-checks to protect against timing attacks.
 */
export function verifyWebhookSecret(providedSecret: string | null | undefined): boolean {
  const configuredSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
  if (!configuredSecret || !providedSecret) {
    return false;
  }

  const providedBuffer = Buffer.from(providedSecret, "utf8");
  const configuredBuffer = Buffer.from(configuredSecret, "utf8");

  // Constant-time comparison requires equal buffer lengths
  if (providedBuffer.length !== configuredBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, configuredBuffer);
}

/**
 * Validates the Background Logistics Recovery Cron secret using constant-time comparison
 * with strict length pre-checks.
 *
 * Dedicated Security Rule:
 * Requires LOGISTICS_CRON_SECRET exclusively. Never falls back to generic CRON_SECRET.
 */
export function verifyCronSecret(providedSecret: string | null | undefined): boolean {
  const configuredSecret = process.env.LOGISTICS_CRON_SECRET;
  if (!configuredSecret || !providedSecret) {
    return false;
  }

  const providedBuffer = Buffer.from(providedSecret, "utf8");
  const configuredBuffer = Buffer.from(configuredSecret, "utf8");

  if (providedBuffer.length !== configuredBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, configuredBuffer);
}

