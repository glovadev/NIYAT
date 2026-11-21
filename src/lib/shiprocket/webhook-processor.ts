import crypto from "crypto";
import mongoose from "mongoose";
import { Order, IOrder, FulfilmentStatus, IOrderTrackingActivity } from "@/models/Order";
import { WebhookEvent, IWebhookEvent } from "@/models/WebhookEvent";
import { safeLog, safeWarn, safeError } from "./sanitize";
import {
  ShiprocketWebhookPayload,
  extractWebhookEventId,
  generateDeterministicScanKey,
} from "./webhook-types";

const FULFILMENT_RANK: Record<string, number> = {
  PENDING_PAYMENT: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  PACKED: 3,
  SHIPPED: 4,
  OUT_FOR_DELIVERY: 5,
  DELIVERED: 6,
};

export interface ProcessWebhookResult {
  success: boolean;
  duplicate?: boolean;
  matched?: boolean;
  eventId: string;
  orderNumber?: string;
  newFulfillmentStatus?: string;
  shippingStatus?: string;
  message: string;
}

/**
 * Renews the worker's lease if processing requires more time.
 * - Strictly conditional on active workerId.
 * - Fails if lease has already expired or been claimed by another worker.
 * - A worker must halt processing if renewal fails.
 */
export async function renewWebhookWorkerLease(
  eventId: string,
  workerId: string,
  extensionMs: number = 60 * 1000
): Promise<boolean> {
  const now = new Date();
  const newExpiry = new Date(now.getTime() + extensionMs);

  const renewed = await WebhookEvent.findOneAndUpdate(
    {
      provider: "SHIPROCKET",
      eventId,
      workerId,
      status: "PROCESSING",
      leaseExpiresAt: { $gt: now },
    },
    {
      $set: {
        leaseExpiresAt: newExpiry,
      },
    },
    { new: true }
  );

  return !!renewed;
}

/**
 * Durable ingestion & processing of Shiprocket webhooks.
 *
 * Implements:
 * - Atomic event insertion and idempotency deduplication.
 * - Compare-and-set worker claiming with lease expiration.
 * - Multi-document transaction coordination & pre-flight Order mutation fencing.
 * - Monotonic fulfillment progression (no out-of-order regressions).
 * - Distinguishes overall shipment_status_id vs current_status_id.
 * - Status 7 === DELIVERED, Status 18 === IN TRANSIT (never delivered).
 * - Never marks COD orders as PAID automatically.
 * - Never cancels customer orders solely due to carrier status 8.
 * - Deterministic scan keys without inventing fake timestamps or descriptions.
 */
export async function processShiprocketWebhook(
  payload: ShiprocketWebhookPayload
): Promise<ProcessWebhookResult> {
  const { eventId, isBestEffort } = extractWebhookEventId(payload);
  const awb = (payload.awb || "").trim();

  // 1. Explicitly distinguish overall shipment status vs checkpoint scan status
  const rawShipmentStatusId =
    payload.shipment_status_id != null && !isNaN(Number(payload.shipment_status_id))
      ? Number(payload.shipment_status_id)
      : undefined;
  const overallStatusId = rawShipmentStatusId;

  const rawCurrentStatusId =
    payload.current_status_id != null && !isNaN(Number(payload.current_status_id))
      ? Number(payload.current_status_id)
      : undefined;
  const checkpointStatusId = rawCurrentStatusId;

  const currentStatusDesc = (payload.current_status || "").trim();

  safeLog(
    "Webhook",
    `Received Shiprocket webhook event ${eventId} for AWB: ${awb || "N/A"}, shipment_status_id: ${overallStatusId ?? "N/A"}, current_status_id: ${checkpointStatusId ?? "N/A"}`
  );

  // 2. Atomic Ingestion & Deduplication
  const now = new Date();
  let webhookRecord: IWebhookEvent;

  try {
    webhookRecord = await WebhookEvent.create({
      provider: "SHIPROCKET",
      eventId,
      eventType: `shipment.status.${overallStatusId ?? checkpointStatusId ?? "checkpoint"}`,
      payload: payload as Record<string, unknown>,
      status: "RECEIVED",
      isBestEffort,
      attempts: 0,
    });
  } catch (err: unknown) {
    // Duplicate Key (MongoDB code 11000)
    if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
      const existing = await WebhookEvent.findOne({ provider: "SHIPROCKET", eventId });
      if (existing) {
        // A. If already successfully processed or marked duplicate, return safely
        if (existing.status === "PROCESSED" || existing.status === "DUPLICATE") {
          safeLog("Webhook", `Duplicate webhook event already processed: ${eventId}`);
          return {
            success: true,
            duplicate: true,
            eventId,
            message: "Duplicate webhook event already processed",
          };
        }

        // B. If actively being processed by a live worker lease, return in-progress
        if (existing.status === "PROCESSING" && existing.leaseExpiresAt && existing.leaseExpiresAt > now) {
          safeLog("Webhook", `Duplicate delivery for in-flight event ${eventId} under active worker lease`);
          return {
            success: true,
            eventId,
            message: "Event already in active processing by another worker",
          };
        }

        // C. If RECEIVED or recoverable (expired lease or FAILED with attempts < 3), reuse for claiming
        webhookRecord = existing;
      } else {
        safeLog("Webhook", `Duplicate webhook event detected: ${eventId}`);
        return {
          success: true,
          duplicate: true,
          eventId,
          message: "Duplicate webhook event detected",
        };
      }
    } else {
      throw err;
    }
  }

  // 3. Claim Worker Lease with Comprehensive CAS
  // Supports: missing leaseExpiresAt, null leaseExpiresAt, expired leaseExpiresAt, and expired PROCESSING events
  const workerId = `wh_worker_${crypto.randomUUID().slice(0, 8)}`;
  const leaseDurationMs = 60 * 1000; // 60s lease
  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);

  const claimFilter = {
    provider: "SHIPROCKET",
    eventId,
    $or: [
      // Newly inserted RECEIVED events (lease missing or null)
      { status: "RECEIVED", leaseExpiresAt: { $exists: false } },
      { status: "RECEIVED", leaseExpiresAt: null },
      // Previously RECEIVED events whose lease expired
      { status: "RECEIVED", leaseExpiresAt: { $lt: now } },
      // Expired PROCESSING events from crashed or timed-out workers
      { status: "PROCESSING", leaseExpiresAt: { $lt: now } },
      // Recoverable FAILED events with attempts < 3
      { status: "FAILED", attempts: { $lt: 3 } },
    ],
  };

  const claimed = await WebhookEvent.findOneAndUpdate(
    claimFilter,
    {
      $set: {
        status: "PROCESSING",
        workerId,
        leaseExpiresAt,
      },
      $inc: { attempts: 1 },
    },
    { new: true }
  );

  if (!claimed) {
    safeWarn("Webhook", `Event ${eventId} could not be claimed: currently held by active worker`);
    return {
      success: true,
      eventId,
      message: "Event already in active processing by another worker",
    };
  }

  try {
    // 4. Match Order
    let matchedOrder: IOrder | null = null;
    if (awb) {
      matchedOrder = await Order.findOne({ "shipment.awbCode": awb });
    }
    if (!matchedOrder && payload.order_id) {
      matchedOrder = await Order.findOne({ "shipment.shiprocketOrderId": Number(payload.order_id) });
    }
    if (!matchedOrder && payload.channel_order_id) {
      matchedOrder = await Order.findOne({ orderNumber: String(payload.channel_order_id).trim() });
    }

    if (!matchedOrder) {
      safeWarn("Webhook", `No matching order found for AWB: '${awb}', order_id: '${payload.order_id}'`);
      await WebhookEvent.findOneAndUpdate(
        { _id: webhookRecord._id, workerId },
        {
          $set: {
            status: "FAILED",
            error: `No matching NIYAT order found for AWB: ${awb || "N/A"}`,
            leaseExpiresAt: null,
            processedAt: new Date(),
          },
        }
      );

      return {
        success: false,
        matched: false,
        eventId,
        message: "No matching order found for incoming shipment",
      };
    }

    // 5. Process Checkpoints / Scans
    const scans = Array.isArray(payload.scans) ? payload.scans : [];
    const existingActivities: IOrderTrackingActivity[] = matchedOrder.shipment?.trackingActivities || [];
    const existingKeys = new Set(existingActivities.map((a) => a.scanKey));
    const newActivities: IOrderTrackingActivity[] = [];
    let hasIncompleteScans = false;
    let incompleteReason = "";

    for (const scan of scans) {
      const scanRes = generateDeterministicScanKey(awb || matchedOrder.shipment?.awbCode || "", scan);
      if (scanRes.isIncomplete) {
        hasIncompleteScans = true;
        incompleteReason = scanRes.reason || "Incomplete checkpoint fields";
        continue; // Do not invent fake timestamps or descriptions
      }

      if (scanRes.scanKey && !existingKeys.has(scanRes.scanKey)) {
        existingKeys.add(scanRes.scanKey);
        newActivities.push({
          scanKey: scanRes.scanKey,
          date: scan.date!,
          status: scan.status || currentStatusDesc || "Checkpoint Update",
          activity: scan.activity || scan.status || "Status Update",
          location: scan.location || "",
          srStatusCode: scan["sr-status"] != null ? Number(scan["sr-status"]) : checkpointStatusId,
        });
      }
    }

    // 6. Monotonic Status Mapping & Rule Enforcements
    const currentFulfilment = matchedOrder.fulfilmentStatus;
    const currentRank = FULFILMENT_RANK[currentFulfilment] ?? 0;
    let targetFulfilment: FulfilmentStatus | undefined;
    let targetShippingStatus = currentStatusDesc || matchedOrder.shipment?.currentShippingStatus;
    const orderUpdates: Record<string, unknown> = {};
    const pushUpdates: Record<string, unknown> = {};
    const addToSetUpdates: Record<string, unknown> = {};

    if (newActivities.length > 0) {
      addToSetUpdates["shipment.trackingActivities"] = { $each: newActivities };
    }

    if (payload.courier_name && !matchedOrder.shipment?.courierName) {
      orderUpdates["shipment.courierName"] = payload.courier_name;
    }
    if (payload.etd) {
      orderUpdates["shipment.estimatedDeliveryDate"] = new Date(payload.etd);
    }

    // Record checkpoint status code if present
    if (checkpointStatusId !== undefined) {
      orderUpdates["shipment.currentStatusCode"] = checkpointStatusId;
    } else if (overallStatusId !== undefined) {
      orderUpdates["shipment.currentStatusCode"] = overallStatusId;
    }

    // Evaluate Overall Status vs Checkpoint Status:
    if (overallStatusId === undefined) {
      // RULE: Do not automatically promote a scan status to overall shipment status when shipment_status_id is absent.
      // Preserve valid scan data even when overall status is missing; flag for admin review.
      if (checkpointStatusId !== undefined || currentStatusDesc) {
        targetShippingStatus = currentStatusDesc || `Checkpoint (Status ${checkpointStatusId})`;
      }
      orderUpdates["shipment.requiresReview"] = true;
      orderUpdates["shipment.reviewCategory"] = "INCOMPLETE_WEBHOOK";
      orderUpdates["shipment.reviewReason"] = `Webhook received with checkpoint data (current_status_id: ${checkpointStatusId ?? "N/A"}) but missing overall shipment_status_id. Scans recorded; flagged for review.`;
      hasIncompleteScans = true;
      incompleteReason = "Missing shipment_status_id";
    } else {
      // --- Overall Shipment Status Matrix ---
      switch (overallStatusId) {
        case 7: {
          // DELIVERED (Status 7)
          targetShippingStatus = "Delivered";
          // Monotonic guard: only advance if below DELIVERED
          if (currentRank < FULFILMENT_RANK.DELIVERED) {
            targetFulfilment = "DELIVERED";
          }
          orderUpdates["shipment.deliveredAt"] = new Date();

          // STRICT SAFETY RULE:
          // Never automatically change COD payment status to PAID!
          // COD settlement requires verification via cash collection ledger.
          break;
        }

        case 18: {
          // IN TRANSIT (Status 18 is strictly In Transit, NEVER Delivered!)
          targetShippingStatus = "In Transit";
          if (currentRank < FULFILMENT_RANK.SHIPPED) {
            targetFulfilment = "SHIPPED";
          }
          break;
        }

        case 6: {
          // SHIPPED
          targetShippingStatus = "Shipped";
          if (currentRank < FULFILMENT_RANK.SHIPPED) {
            targetFulfilment = "SHIPPED";
          }
          if (!matchedOrder.shipment?.shippedAt) {
            orderUpdates["shipment.shippedAt"] = new Date();
          }
          break;
        }

        case 19: {
          // OUT FOR DELIVERY
          targetShippingStatus = "Out for Delivery";
          if (currentRank < FULFILMENT_RANK.OUT_FOR_DELIVERY) {
            targetFulfilment = "OUT_FOR_DELIVERY";
          }
          break;
        }

        case 8: {
          // CARRIER CANCELLATION (Status 8)
          // STRICT SAFETY RULE:
          // Carrier cancelling shipment does NOT cancel customer order!
          // Do NOT set orderStatus or paymentStatus to CANCELLED.
          targetShippingStatus = "Carrier Cancelled";
          orderUpdates["shipment.shipmentState"] = "REASSIGNMENT_BLOCKED";
          orderUpdates["shipment.requiresReview"] = true;
          orderUpdates["shipment.reviewCategory"] = "CARRIER_CANCELLATION";
          orderUpdates["shipment.reviewReason"] = `Carrier cancelled AWB ${awb || matchedOrder.shipment?.awbCode}. Courier reassignment blocked pending review.`;

          pushUpdates["shipment.carrierCancellations"] = {
            incidentKey: `cc_${awb || matchedOrder.orderNumber}_${Date.now()}`,
            isBestEffort,
            originatingWebhookEventId: eventId,
            receivedAt: new Date(),
            rawActivity: currentStatusDesc || "Carrier cancelled shipment",
            sourceStatusId: 8,
            shipmentStateAtCancellation: matchedOrder.shipment?.shipmentState || "AWB_ASSIGNED",
            awbCode: awb || matchedOrder.shipment?.awbCode || "",
            resolved: false,
          };

          pushUpdates["statusHistory"] = {
            type: "FULFILMENT",
            from: matchedOrder.shipment?.shipmentState,
            to: "REASSIGNMENT_BLOCKED",
            actorType: "WEBHOOK",
            actorId: eventId,
            reason: "Carrier cancelled shipment (Status 8). Courier reassignment blocked.",
            at: new Date(),
          };
          break;
        }

        case 9: {
          // RTO INITIATED
          targetShippingStatus = "RTO Initiated";
          if (currentFulfilment === "DELIVERED") {
            orderUpdates["shipment.requiresReview"] = true;
            orderUpdates["shipment.reviewCategory"] = "CARRIER_EXCEPTION";
            orderUpdates["shipment.reviewReason"] = "Anomaly: Carrier reported RTO Initiated for an order already marked as DELIVERED. Manual review required.";
          } else {
            orderUpdates["shipment.requiresReview"] = true;
            orderUpdates["shipment.reviewCategory"] = "CARRIER_EXCEPTION";
            orderUpdates["shipment.reviewReason"] = "Return to Origin (RTO) initiated by carrier";
          }
          break;
        }

        case 10: {
          // RTO DELIVERED
          targetShippingStatus = "RTO Delivered";
          if (currentFulfilment === "DELIVERED") {
            // CRITICAL TERMINAL GUARD:
            // RTO_DELIVERED must not automatically overwrite an already DELIVERED order without valid transition and review!
            orderUpdates["shipment.requiresReview"] = true;
            orderUpdates["shipment.reviewCategory"] = "CARRIER_EXCEPTION";
            orderUpdates["shipment.reviewReason"] = "Conflict Anomaly: Carrier reported RTO Delivered for an order already marked as DELIVERED to customer. Preservation guard engaged; manual review required.";
          } else {
            targetFulfilment = "RETURNED";
            orderUpdates["shipment.requiresReview"] = true;
            orderUpdates["shipment.reviewCategory"] = "CARRIER_EXCEPTION";
            orderUpdates["shipment.reviewReason"] = "Package returned to warehouse (RTO Delivered)";
          }
          break;
        }

        case 1:
        case 15: {
          targetShippingStatus = "AWB Assigned";
          break;
        }

        case 3:
        case 4: {
          targetShippingStatus = "Pickup Scheduled";
          break;
        }

        case 17: {
          targetShippingStatus = "Out for Pickup";
          break;
        }

        default: {
          // Unrecognized carrier status ID -> preserve for review
          if (currentStatusDesc) {
            targetShippingStatus = currentStatusDesc;
          }
          orderUpdates["shipment.requiresReview"] = true;
          orderUpdates["shipment.reviewCategory"] = "CARRIER_EXCEPTION";
          orderUpdates["shipment.reviewReason"] = `Unrecognized carrier status ID: ${overallStatusId} (${currentStatusDesc || "Unknown"})`;
          hasIncompleteScans = true;
          incompleteReason = `Unrecognized carrier status ID ${overallStatusId}`;
          break;
        }
      }
    }

    if (targetShippingStatus) {
      orderUpdates["shipment.currentShippingStatus"] = targetShippingStatus;
    }

    // Apply Monotonic Fulfilment Status Transition
    if (targetFulfilment && targetFulfilment !== currentFulfilment) {
      orderUpdates["fulfilmentStatus"] = targetFulfilment;
      pushUpdates["statusHistory"] = {
        type: "FULFILMENT",
        from: currentFulfilment,
        to: targetFulfilment,
        actorType: "WEBHOOK",
        actorId: eventId,
        reason: `Webhook update: ${targetShippingStatus} (Status ID: ${overallStatusId ?? "N/A"})`,
        at: new Date(),
      };
    }

    // Flag incomplete scans if any were detected
    if (hasIncompleteScans && !orderUpdates["shipment.requiresReview"]) {
      orderUpdates["shipment.requiresReview"] = true;
      orderUpdates["shipment.reviewCategory"] = "INCOMPLETE_WEBHOOK";
      orderUpdates["shipment.reviewReason"] = `Incomplete scan checkpoints received in webhook: ${incompleteReason}`;
    }

    // Commit DB Update to Order with Strict Worker Ownership Fencing
    const updateDoc: Record<string, unknown> = {};
    if (Object.keys(orderUpdates).length > 0) {
      updateDoc.$set = orderUpdates;
    }
    if (Object.keys(pushUpdates).length > 0) {
      updateDoc.$push = pushUpdates;
    }
    if (Object.keys(addToSetUpdates).length > 0) {
      updateDoc.$addToSet = addToSetUpdates;
    }

    const finalEventStatus = hasIncompleteScans ? "INCOMPLETE" : "PROCESSED";
    const finalErrorMsg = hasIncompleteScans ? `Processed with incomplete/unverified checkpoints: ${incompleteReason}` : null;

    let appliedOrderMutation = false;

    // Transaction Coordination Strategy:
    // Webhook Order processing REQUIRES a transaction-capable MongoDB topology (replica set or sharded cluster).
    // Standalone fallback has been eliminated to guarantee 0% TOCTOU race conditions.
    const session = await mongoose.startSession().catch(() => null);
    if (session) {
      try {
        await session.withTransaction(async () => {
          const nowInTx = new Date();

          // 1. SHARED-DOCUMENT WRITE FENCE (Conditional Ownership Write):
          // Under MongoDB Snapshot Isolation, a read alone does not take locks.
          // By executing an atomic conditional write ($inc fenceVersion) on WebhookEvent
          // matching workerId, PROCESSING status, and leaseExpiresAt > now:
          // a) We acquire an exclusive write lock on WebhookEvent in WiredTiger.
          // b) Any competing worker attempting lease takeover will experience a write conflict.
          // c) If a competing worker already took over, this conditional write returns null.
          const fenceResult = await WebhookEvent.findOneAndUpdate(
            {
              _id: webhookRecord._id,
              workerId,
              status: "PROCESSING",
              leaseExpiresAt: { $gt: nowInTx },
            },
            {
              $inc: { fenceVersion: 1 },
            },
            { session, new: true }
          );

          if (!fenceResult) {
            throw new Error("WORKER_LEASE_FENCE_FAILED");
          }

          // 2. Read current state of Order inside transaction
          const currentOrderInTx = await Order.findById(matchedOrder._id, null, { session });
          if (!currentOrderInTx) {
            throw new Error("ORDER_NOT_FOUND_IN_TX");
          }

          const currentTxFulfilment = currentOrderInTx.fulfilmentStatus;
          const currentTxRank = FULFILMENT_RANK[currentTxFulfilment] ?? 0;
          const isAlreadyDelivered = currentTxFulfilment === "DELIVERED";
          const isStaleEvent = targetFulfilment ? currentTxRank >= (FULFILMENT_RANK[targetFulfilment] ?? 0) : false;

          const txSet: Record<string, unknown> = {};
          const txPush: Record<string, unknown> = {};
          const txAddToSet: Record<string, unknown> = {};

          // Safe tracking checkpoints: always append non-duplicate historical scans via $addToSet
          if (newActivities.length > 0) {
            txAddToSet["shipment.trackingActivities"] = { $each: newActivities };
          }

          // Safe non-conflicting metadata: only set courier name if not already set
          if (payload.courier_name && !currentOrderInTx.shipment?.courierName) {
            txSet["shipment.courierName"] = payload.courier_name;
          }

          if (isStaleEvent || isAlreadyDelivered) {
            // CRITICAL AUDIT RULE:
            // Stale or already-advanced order must NEVER receive:
            // - shipmentState changes
            // - AWB or shipment ID changes
            // - review flag or review reason overwrites
            // - status regressions
            safeLog(
              "Webhook",
              `Order ${currentOrderInTx.orderNumber} is already at status ${currentTxFulfilment} (rank ${currentTxRank}). Skipping status/state/review mutations from stale event ${eventId}.`
            );

            // Special exception: RTO Delivered (10) arriving after DELIVERED is a forward conflict anomaly
            if (isAlreadyDelivered && overallStatusId === 10) {
              txSet["shipment.requiresReview"] = true;
              txSet["shipment.reviewCategory"] = "CARRIER_EXCEPTION";
              txSet["shipment.reviewReason"] = "Conflict Anomaly: Carrier reported RTO Delivered for an order already marked as DELIVERED to customer. Preservation guard engaged; manual review required.";
            }
          } else {
            // Forward / Valid Order Progression:
            // Merge validated orderUpdates and pushUpdates
            for (const [k, v] of Object.entries(orderUpdates)) {
              txSet[k] = v;
            }
            for (const [k, v] of Object.entries(pushUpdates)) {
              txPush[k] = v;
            }
          }

          // Execute Fenced Order Mutation in Transaction
          const txUpdateDoc: Record<string, unknown> = {};
          if (Object.keys(txSet).length > 0) txUpdateDoc.$set = txSet;
          if (Object.keys(txPush).length > 0) txUpdateDoc.$push = txPush;
          if (Object.keys(txAddToSet).length > 0) txUpdateDoc.$addToSet = txAddToSet;

          if (Object.keys(txUpdateDoc).length > 0) {
            await Order.findByIdAndUpdate(matchedOrder._id, txUpdateDoc, { session, new: true });
          }

          // 3. Complete WebhookEvent inside same transaction
          await WebhookEvent.findOneAndUpdate(
            { _id: webhookRecord._id, workerId },
            {
              $set: {
                status: finalEventStatus,
                processedAt: new Date(),
                leaseExpiresAt: null,
                error: finalErrorMsg,
              },
            },
            { session, new: true }
          );

          appliedOrderMutation = true;
        });
      } catch (txErr: unknown) {
        if (txErr instanceof Error && txErr.message === "WORKER_LEASE_FENCE_FAILED") {
          safeWarn(
            "Webhook",
            `Worker ${workerId} transaction write fence failed: lease expired or lost for event ${eventId}. Order mutation aborted.`
          );
          return {
            success: false,
            eventId,
            message: "Worker lease fence failed. Order mutation aborted.",
          };
        }
        // Topology error or transaction failure -> fail closed
        appliedOrderMutation = false;
      } finally {
        await session.endSession().catch(() => {});
      }
    }

    // FAIL-CLOSED POLICY (Standalone / Unsupported Transactions):
    // If multi-document ACID transactions are unavailable, DO NOT perform any Order mutation!
    // Fail closed: do not update Order shipment fields, fulfilment status, review fields, or tracking activities.
    // Preserve event for safe retry or administrative investigation.
    if (!appliedOrderMutation) {
      safeError(
        "Webhook",
        `MongoDB deployment does not support multi-document ACID transactions. Failing closed for event ${eventId}. Webhook Order processing requires a transaction-capable MongoDB replica set.`
      );

      await WebhookEvent.findOneAndUpdate(
        { _id: webhookRecord._id, workerId },
        {
          $set: {
            status: "FAILED",
            leaseExpiresAt: null,
            error: "RECOVERABLE_UNSUPPORTED_TRANSACTIONS: Webhook Order processing requires transaction-capable MongoDB replica set.",
          },
        }
      );

      return {
        success: false,
        eventId,
        message: "Multi-document transactions unavailable. Failed closed to prevent TOCTOU race.",
      };
    }

    safeLog(
      "Webhook",
      `Successfully processed event ${eventId} for order ${matchedOrder.orderNumber} (Outcome: ${finalEventStatus})`
    );

    return {
      success: true,
      eventId,
      orderNumber: matchedOrder.orderNumber,
      newFulfillmentStatus: targetFulfilment || currentFulfilment,
      shippingStatus: targetShippingStatus,
      message: `Webhook processed successfully (${finalEventStatus})`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    safeError("Webhook", `Failed to process webhook event ${eventId}: ${errorMsg}`);

    // Conditional update on workerId prevents stale failed writes
    await WebhookEvent.findOneAndUpdate(
      { _id: webhookRecord._id, workerId },
      {
        $set: {
          status: "FAILED",
          error: errorMsg,
          leaseExpiresAt: null,
        },
      }
    );

    return {
      success: false,
      eventId,
      message: `Webhook processing error: ${errorMsg}`,
    };
  }
}

