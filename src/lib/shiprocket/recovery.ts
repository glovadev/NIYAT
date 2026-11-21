import { Order } from "@/models/Order";
import { WebhookEvent } from "@/models/WebhookEvent";
import { reconcileShipment, ReconcileResult } from "./reconciliation";
import { processShiprocketWebhook, ProcessWebhookResult } from "./webhook-processor";
import { safeLog, safeWarn, safeError } from "./sanitize";

export interface RecoveryReport {
  timestamp: string;
  leasesRecovered: number;
  leasesFailedMaxAttempts: number;
  webhooksReprocessed: number;
  shipmentsReconciled: number;
  shipmentsRemainingInReview: number;
  details: {
    recoveredEventIds: string[];
    failedEventIds: string[];
    reconciledOrders: Array<{ orderNumber: string; newState: string; reconciled: boolean }>;
  };
}

/**
 * Recovers webhook events with expired worker leases.
 *
 * If attempts < 3: Resets to RECEIVED for safe replay.
 * If attempts >= 3: Marks FAILED to prevent poison-pill loops.
 */
export async function recoverExpiredWebhookLeases(): Promise<{
  recovered: string[];
  failed: string[];
}> {
  const now = new Date();
  const expiredEvents = await WebhookEvent.find({
    provider: "SHIPROCKET",
    status: "PROCESSING",
    leaseExpiresAt: { $lt: now },
  }).limit(50);

  const recovered: string[] = [];
  const failed: string[] = [];

  for (const evt of expiredEvents) {
    if ((evt.attempts || 1) >= 3) {
      await WebhookEvent.findByIdAndUpdate(evt._id, {
        $set: {
          status: "FAILED",
          error: `Max processing attempts (${evt.attempts}) exceeded after multiple worker lease timeouts`,
          leaseExpiresAt: null,
        },
      });
      failed.push(evt.eventId);
      safeWarn("Recovery", `Event ${evt.eventId} exceeded max lease attempts. Marked FAILED.`);
    } else {
      await WebhookEvent.findByIdAndUpdate(evt._id, {
        $set: {
          status: "RECEIVED",
          workerId: null,
          leaseExpiresAt: null,
        },
      });
      recovered.push(evt.eventId);
      safeLog("Recovery", `Recovered expired lease for event ${evt.eventId}. Reset to RECEIVED for replay.`);
    }
  }

  return { recovered, failed };
}

/**
 * Reconciles ambiguous shipment operations where lock timestamp is older than 5 minutes.
 * Uses read-only remote queries and never repeats mutating API calls.
 */
export async function reconcileAmbiguousShipments(): Promise<
  Array<{ orderNumber: string; newState: string; reconciled: boolean }>
> {
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes stale

  const ambiguousOrders = await Order.find({
    "shipment.shipmentState": "RECONCILIATION_REQUIRED",
    $or: [
      { "shipment.lockTimestamp": { $lt: staleThreshold } },
      { "shipment.lockTimestamp": null },
      { "shipment.lockTimestamp": { $exists: false } },
    ],
  }).limit(25);

  const results: Array<{ orderNumber: string; newState: string; reconciled: boolean }> = [];

  for (const order of ambiguousOrders) {
    try {
      safeLog("Recovery", `Automated reconciliation check for order ${order.orderNumber}`);
      const res: ReconcileResult = await reconcileShipment(String(order._id));
      results.push({
        orderNumber: res.orderNumber,
        newState: res.newState,
        reconciled: res.reconciled,
      });
    } catch (err: unknown) {
      safeError(
        "Recovery",
        `Failed to reconcile order ${order.orderNumber}: ${err instanceof Error ? err.message : String(err)}`
      );
      results.push({
        orderNumber: order.orderNumber,
        newState: order.shipment?.shipmentState || "RECONCILIATION_REQUIRED",
        reconciled: false,
      });
    }
  }

  return results;
}

/**
 * Master Logistics Recovery Job.
 * Idempotent, safe for periodic invocation (e.g. every 5–15 minutes).
 */
export async function runLogisticsRecoveryJob(): Promise<RecoveryReport> {
  safeLog("Recovery", "Starting scheduled logistics recovery routine...");

  // 1. Recover expired worker leases
  const { recovered, failed } = await recoverExpiredWebhookLeases();

  // 2. Reprocess newly reset RECEIVED webhook events (batch of up to 10)
  let reprocessedCount = 0;
  if (recovered.length > 0) {
    const eventsToProcess = await WebhookEvent.find({
      provider: "SHIPROCKET",
      status: "RECEIVED",
      eventId: { $in: recovered },
    }).limit(10);

    for (const evt of eventsToProcess) {
      try {
        const procRes: ProcessWebhookResult = await processShiprocketWebhook(evt.payload as any);
        if (procRes.success) {
          reprocessedCount++;
        }
      } catch (err: unknown) {
        safeError("Recovery", `Error reprocessing recovered event ${evt.eventId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // 3. Reconcile ambiguous shipments safely
  const reconciliationOutcomes = await reconcileAmbiguousShipments();
  const shipmentsReconciled = reconciliationOutcomes.filter((o) => o.reconciled).length;
  const shipmentsRemainingInReview = reconciliationOutcomes.filter((o) => !o.reconciled).length;

  const report: RecoveryReport = {
    timestamp: new Date().toISOString(),
    leasesRecovered: recovered.length,
    leasesFailedMaxAttempts: failed.length,
    webhooksReprocessed: reprocessedCount,
    shipmentsReconciled,
    shipmentsRemainingInReview,
    details: {
      recoveredEventIds: recovered,
      failedEventIds: failed,
      reconciledOrders: reconciliationOutcomes,
    },
  };

  safeLog("Recovery", `Logistics recovery routine finished: ${JSON.stringify({
    leasesRecovered: report.leasesRecovered,
    webhooksReprocessed: report.webhooksReprocessed,
    shipmentsReconciled: report.shipmentsReconciled,
  })}`);

  return report;
}
