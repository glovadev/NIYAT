import mongoose from "mongoose";
import crypto from "crypto";
import { Order, IOrder, ShipmentState } from "@/models/Order";

const DEFAULT_STALE_LOCK_MS = 5 * 60 * 1000; // 5 minutes

export interface LockAcquisitionResult {
  acquired: boolean;
  operationId: string;
  order?: IOrder;
  error?: string;
}

/**
 * Atomically acquires the operational lock on an order's shipment.
 * Strictly prevents concurrent workers or double-clicking admins from triggering competing operations.
 */
export async function acquireShipmentLock(
  orderId: string | mongoose.Types.ObjectId,
  inProgressState: ShipmentState,
  validPrecedingStates: ShipmentState[],
  staleLockTimeoutMs = DEFAULT_STALE_LOCK_MS
): Promise<LockAcquisitionResult> {
  const operationId = `op_${crypto.randomUUID()}_${Date.now()}`;
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - staleLockTimeoutMs);

  // If shipment subdocument is null, initialize it to IDLE
  await Order.updateOne(
    { _id: orderId, shipment: null },
    {
      $set: {
        shipment: {
          shipmentState: "IDLE",
          trackingActivities: [],
          carrierCancellations: [],
          awbCancellations: [],
          requiresReview: false,
        },
      },
    }
  );

  const filter = {
    _id: orderId,
    "shipment.shipmentState": { $in: validPrecedingStates },
    $or: [
      { "shipment.lockTimestamp": { $exists: false } },
      { "shipment.lockTimestamp": null },
      { "shipment.lockTimestamp": { $lt: staleThreshold } },
    ],
  };

  const update = {
    $set: {
      "shipment.shipmentState": inProgressState,
      "shipment.operationId": operationId,
      "shipment.lockTimestamp": now,
    },
  };

  const updatedOrder = await Order.findOneAndUpdate(filter, update, { new: true });

  if (!updatedOrder) {
    const currentOrder = await Order.findById(orderId);
    if (!currentOrder) {
      return { acquired: false, operationId, error: "Order not found" };
    }

    const state = currentOrder.shipment?.shipmentState || "IDLE";
    if (!validPrecedingStates.includes(state)) {
      return {
        acquired: false,
        operationId,
        error: `Cannot transition from current state '${state}'. Required one of: ${validPrecedingStates.join(", ")}`,
      };
    }

    return {
      acquired: false,
      operationId,
      error: `Shipment operation is currently locked by in-flight operation '${currentOrder.shipment?.operationId}' until lock expires`,
    };
  }

  return { acquired: true, operationId, order: updatedOrder };
}

/**
 * Releases the operational lock upon verified completion of an external operation.
 */
export async function releaseShipmentLock(
  orderId: string | mongoose.Types.ObjectId,
  operationId: string,
  finalSuccessState: ShipmentState,
  additionalShipmentFields: Record<string, unknown> = {}
): Promise<IOrder | null> {
  const updateFields: Record<string, unknown> = {
    "shipment.shipmentState": finalSuccessState,
    "shipment.operationId": null,
    "shipment.lockTimestamp": null,
    "shipment.lastError": null,
  };

  for (const [key, value] of Object.entries(additionalShipmentFields)) {
    updateFields[`shipment.${key}`] = value;
  }

  return await Order.findOneAndUpdate(
    { _id: orderId, "shipment.operationId": operationId },
    { $set: updateFields },
    { new: true }
  );
}

/**
 * Transitions the shipment to RECONCILIATION_REQUIRED when an external request encounters
 * an ambiguous timeout or non-deterministic response.
 *
 * Blueprint Rules:
 * 1. NEVER automatically clear the lock or immediately retry.
 * 2. Preserve operationId and lockTimestamp for auditability.
 * 3. Flag requiresReview = true so administrative attention is immediately drawn.
 */
export async function markReconciliationRequired(
  orderId: string | mongoose.Types.ObjectId,
  operationId: string,
  failedStep: "CREATE_ORDER" | "ASSIGN_AWB" | "GENERATE_LABEL" | "SCHEDULE_PICKUP" | "GENERATE_MANIFEST",
  errorMessage: string
): Promise<IOrder | null> {
  return await Order.findOneAndUpdate(
    { _id: orderId, "shipment.operationId": operationId },
    {
      $set: {
        "shipment.shipmentState": "RECONCILIATION_REQUIRED",
        "shipment.lastFailedStep": failedStep,
        "shipment.lastError": errorMessage,
        "shipment.requiresReview": true,
        "shipment.reviewReason": `Ambiguous response during ${failedStep}: ${errorMessage}. Reconcile with Shiprocket before retrying.`,
      },
    },
    { new: true }
  );
}

/**
 * Sets the shipment state to FAILED upon a decisive, confirmed rejection from Shiprocket.
 */
export async function markShipmentFailed(
  orderId: string | mongoose.Types.ObjectId,
  operationId: string,
  failedStep: "CREATE_ORDER" | "ASSIGN_AWB" | "GENERATE_LABEL" | "SCHEDULE_PICKUP" | "GENERATE_MANIFEST",
  errorMessage: string
): Promise<IOrder | null> {
  return await Order.findOneAndUpdate(
    { _id: orderId, "shipment.operationId": operationId },
    {
      $set: {
        "shipment.shipmentState": "FAILED",
        "shipment.operationId": null,
        "shipment.lockTimestamp": null,
        "shipment.lastFailedStep": failedStep,
        "shipment.lastError": errorMessage,
      },
    },
    { new: true }
  );
}

