/**
 * In-memory sliding window rate limiter for security-sensitive public endpoints.
 * Automatically evicts stale windows to prevent memory leaks.
 *
 * Architecture & Deployment Note:
 * In a single-process PM2 / Node.js instance on Hostinger VPS, this in-memory sliding-window
 * store provides sub-millisecond, zero-database-overhead protection with automatic eviction.
 * For clustered or distributed deployments (multiple PM2 cluster workers or multi-node servers),
 * rate limiting should be backed by Redis or an atomic MongoDB TTL collection.
 */

import { NextRequest } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale keys every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function purgeStale(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const threshold = now - windowMs;
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((t) => t > threshold);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Check if an identifier key (e.g. IP, orderNumber, phone) is within rate limits.
 */
export function checkRateLimit(
  key: string,
  limit: number = 15,
  windowMs: number = 60 * 1000
): RateLimitResult {
  purgeStale(windowMs);

  const now = Date.now();
  const threshold = now - windowMs;
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within the current window
  record.timestamps = record.timestamps.filter((t) => t > threshold);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      resetSeconds,
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  const resetSeconds = Math.ceil(windowMs / 1000);

  return {
    success: true,
    limit,
    remaining,
    resetSeconds,
  };
}

/**
 * Extracts the trusted client IP address from request headers.
 *
 * Security Rationale:
 * 1. Prioritizes `x-real-ip` (set directly by reverse proxy from $remote_addr; cannot be spoofed by client).
 * 2. If `x-real-ip` is absent and `x-forwarded-for` is provided:
 *    When a client sends spoofed `X-Forwarded-For: 1.2.3.4`, a compliant reverse proxy appends the true IP:
 *    `1.2.3.4, <actual_peer_ip>`. Therefore, reading leftmost blindly is vulnerable.
 *    We extract the rightmost valid IP address.
 * 3. Validates IPv4 or IPv6 format to reject malformed or injected header values.
 * 4. Fails safe to "127.0.0.1" if no valid IP header is found.
 */
export function getTrustedClientIp(req: NextRequest | Request): string {
  const headers = req.headers;
  const xRealIp = headers.get("x-real-ip")?.trim();

  const ipRegex = /^(?:(?:\d{1,3}\.){3}\d{1,3}|(?:[a-fA-F0-9]{1,4}:){1,7}[a-fA-F0-9]{1,4}|::1)$/;

  if (xRealIp && ipRegex.test(xRealIp)) {
    return xRealIp;
  }

  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const parts = xForwardedFor
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    // Prefer rightmost valid IP address added by upstream reverse proxy
    for (let i = parts.length - 1; i >= 0; i--) {
      if (ipRegex.test(parts[i])) {
        return parts[i];
      }
    }
  }

  return "127.0.0.1";
}

/**
 * Reset all or specific rate limits. Used for unit and integration testing.
 */
export function resetRateLimits(keyPrefix?: string): void {
  if (!keyPrefix) {
    rateLimitStore.clear();
    return;
  }
  for (const key of rateLimitStore.keys()) {
    if (key.startsWith(keyPrefix)) {
      rateLimitStore.delete(key);
    }
  }
}
