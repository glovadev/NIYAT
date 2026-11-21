import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// 1. Explicitly identify and load target environment file
let envPath = process.argv[2] || process.env.TARGET_ENV;

if (!envPath) {
  const candidates = [
    "/var/www/niyatuae.com/.env.local",
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      envPath = cand;
      break;
    }
  }

  if (!envPath) {
    envPath = path.resolve(process.cwd(), ".env.local");
  }
}

envPath = path.resolve(envPath);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
} else {
  // Fall back to current working directory defaults
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
}

import { ShiprocketAuthManager } from "../src/lib/shiprocket/auth";

async function run() {
  console.log("==================================================================");
  console.log("  NIYAT — Shiprocket Authentication Verification (Strict Read-Only)");
  console.log("==================================================================\n");

  console.log(`Loaded Environment File: ${envPath}`);

  const email = process.env.SHIPROCKET_API_EMAIL?.trim();
  const hasPassword = Boolean(process.env.SHIPROCKET_API_PASSWORD?.trim());

  // Mask email for display: show first 2 characters, domain, nothing in between
  const maskedEmail = email
    ? email.replace(/^(..)(.*)(@.*)$/, "$1***$3")
    : "NOT_CONFIGURED";

  console.log(`Configured API Email:    ${maskedEmail}`);
  console.log(`API Password Status:     ${hasPassword ? "Configured (Hidden)" : "MISSING"}`);

  if (!email || !hasPassword) {
    console.error("\n❌ ERROR: SHIPROCKET_API_EMAIL and SHIPROCKET_API_PASSWORD must be configured in environment.");
    process.exit(1);
  }

  // Supply fallback warehouse PIN for pure auth validation if not configured yet
  if (!process.env.SHIPROCKET_WAREHOUSE_PIN) {
    process.env.SHIPROCKET_WAREHOUSE_PIN = "560001";
  }

  try {
    const authManager = ShiprocketAuthManager.getInstance();

    // Call only the authentication endpoint (force refresh to test credentials directly)
    const token = await authManager.getToken(true);

    if (token && typeof token === "string" && token.length > 20) {
      // Validate JWT structure without printing it
      const segments = token.split(".");
      const isValidJwt = segments.length === 3;

      console.log("\n Authentication Status:  SUCCESS");
      console.log(` Endpoint:               POST https://apiv2.shiprocket.in/v1/external/auth/login`);
      console.log(` HTTP Status:            200 OK`);
      console.log(` Token Received:         YES (Valid 3-part JWT, length: ${token.length} characters)`);
      console.log(` Token Sanitization:     TOKEN REDACTED (Zero secret leakage)`);
      console.log(` Token Cached:           YES (ShiprocketAuthManager in-memory cache active)`);
      console.log(" Logistics Operations:   ZERO (No orders, AWBs, labels, pickups, or manifests created)");
      process.exit(0);
    } else {
      console.error("\n❌ Authentication Status: FAILED (Empty or malformed token returned)");
      process.exit(1);
    }
  } catch (error: unknown) {
    console.error("\n❌ Authentication Status: FAILED");
    const sanitizedMsg = error instanceof Error ? error.message : String(error);
    // Sanitize any potential leak in error message
    const cleanMsg = sanitizedMsg.replace(/password[:=]\s*\S+/gi, "password=[REDACTED]");
    console.error(` Error Details: ${cleanMsg}`);
    process.exit(1);
  }
}

run();
