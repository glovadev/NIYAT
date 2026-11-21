import { ShiprocketConfig } from "./types";
import { ShiprocketConfigError } from "./errors";

const DEFAULT_BASE_URL = "https://apiv2.shiprocket.in/v1/external";
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RETRIES = 2;

export function getShiprocketConfig(): ShiprocketConfig {
  const email = process.env.SHIPROCKET_API_EMAIL?.trim();
  const password = process.env.SHIPROCKET_API_PASSWORD?.trim();

  if (!email || !password) {
    throw new ShiprocketConfigError(
      "Shiprocket credentials not configured. Please set SHIPROCKET_API_EMAIL and SHIPROCKET_API_PASSWORD in your environment variables."
    );
  }

  const defaultPickupLocation = process.env.SHIPROCKET_DEFAULT_PICKUP_LOCATION?.trim();
  const warehousePin = process.env.SHIPROCKET_WAREHOUSE_PIN?.trim();
  const webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET?.trim();

  if (!warehousePin || !/^\d{6}$/.test(warehousePin)) {
    throw new ShiprocketConfigError(
      "Missing or invalid warehouse pickup PIN code. SHIPROCKET_WAREHOUSE_PIN must be explicitly configured as a 6-digit Indian postal PIN code."
    );
  }

  return {
    email,
    password,
    defaultPickupLocation,
    warehousePin,
    webhookSecret,
    baseUrl: process.env.SHIPROCKET_BASE_URL?.trim() || DEFAULT_BASE_URL,
    requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    maxRetries: DEFAULT_MAX_RETRIES,
  };
}

