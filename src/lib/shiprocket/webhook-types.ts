import crypto from "crypto";

export interface ShiprocketScanEvent {
  date?: string;
  status?: string;
  activity?: string;
  location?: string;
  "sr-status"?: string | number;
  "sr-status-label"?: string;
  [key: string]: unknown;
}

export interface ShiprocketWebhookPayload {
  awb?: string;
  order_id?: number | string;
  channel_order_id?: string;
  shipment_status_id?: number | string;
  current_status_id?: number | string;
  current_status?: string;
  courier_name?: string;
  etd?: string;
  scans?: ShiprocketScanEvent[];
  event_id?: string | number;
  id?: string | number;
  [key: string]: unknown;
}

export interface ScanKeyResult {
  scanKey?: string;
  isIncomplete: boolean;
  reason?: string;
}

/**
 * Deterministically generates a scanKey using SHA-256 of stable identity fields.
 *
 * Blueprint Rules:
 * 1. Never fallback to new Date().toISOString() when generating scan identity.
 * 2. Do not invent activity descriptions for incomplete scans.
 * 3. Generate scanKey only when sufficient stable identity fields exist.
 * 4. Replaying the same webhook payload at any point in time produces the exact same scanKey.
 */
export function generateDeterministicScanKey(
  awb: string,
  scan: Partial<ShiprocketScanEvent>
): ScanKeyResult {
  const cleanAwb = (awb || "").trim();
  const cleanDate = (scan.date || "").trim();
  const cleanStatus = (scan.status || "").trim();
  const cleanActivity = (scan.activity || "").trim();
  const cleanLocation = (scan.location || "").trim();
  const srStatus = scan["sr-status"] != null ? String(scan["sr-status"]).trim() : "";

  // Validation: Date is mandatory for a valid tracking checkpoint
  if (!cleanDate) {
    return {
      isIncomplete: true,
      reason: "Missing scan date timestamp in webhook checkpoint",
    };
  }

  // Validation: Either status, activity, or sr-status must be present
  if (!cleanStatus && !cleanActivity && !srStatus) {
    return {
      isIncomplete: true,
      reason: "Missing scan status/activity description in webhook checkpoint",
    };
  }

  // Stable normalized representation:
  // sha256(awb|date|status|activity|location|srStatus)
  const identityString = `${cleanAwb}|${cleanDate}|${cleanStatus.toLowerCase()}|${cleanActivity.toLowerCase()}|${cleanLocation.toLowerCase()}|${srStatus}`;
  const scanKey = crypto.createHash("sha256").update(identityString, "utf8").digest("hex").slice(0, 32);

  return {
    scanKey,
    isIncomplete: false,
  };
}

/**
 * Generates or extracts a durable unique event ID for the incoming webhook.
 * Supports unique provider event IDs and deterministic best-effort fallback.
 */
export function extractWebhookEventId(payload: ShiprocketWebhookPayload): {
  eventId: string;
  isBestEffort: boolean;
} {
  if (payload.event_id != null && String(payload.event_id).trim().length > 0) {
    return { eventId: `sr_evt_${String(payload.event_id).trim()}`, isBestEffort: false };
  }

  if (payload.id != null && String(payload.id).trim().length > 0) {
    return { eventId: `sr_evt_${String(payload.id).trim()}`, isBestEffort: false };
  }

  // Best-effort deterministic deduplication hash
  const awb = (payload.awb || "").trim();
  const statusId = payload.shipment_status_id != null ? String(payload.shipment_status_id) : String(payload.current_status_id || "");
  const currentStatus = (payload.current_status || "").trim().toLowerCase();
  const scansCount = Array.isArray(payload.scans) ? payload.scans.length : 0;
  const latestScanDate = Array.isArray(payload.scans) && payload.scans[0]?.date ? payload.scans[0].date.trim() : "";

  const hashInput = `${awb}|${statusId}|${currentStatus}|${scansCount}|${latestScanDate}`;
  const digest = crypto.createHash("sha256").update(hashInput, "utf8").digest("hex").slice(0, 32);

  return { eventId: `sr_synth_${digest}`, isBestEffort: true };
}

