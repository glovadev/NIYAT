import { Order, IOrder, ShipmentState } from "@/models/Order";
import { ShiprocketClient } from "./client";
import { ShiprocketValidationError } from "./errors";
import { safeLog, safeWarn } from "./sanitize";

export interface ReconcileResult {
  orderNumber: string;
  previousState: ShipmentState;
  newState: ShipmentState;
  reconciled: boolean;
  message: string;
  order: IOrder;
}

interface ShiprocketShowOrderData {
  data?: {
    id: number;
    channel_order_id?: string;
    status: string;
    status_code?: number;
    awb_code?: string;
    courier_name?: string;
    courier_company_id?: number;
    shipments?: Array<{
      id: number;
      awb?: string;
      courier_id?: number;
      courier_name?: string;
      status?: string;
      status_code?: number;
    }>;
  };
}

interface ShiprocketListOrdersData {
  data?: Array<{
    id: number;
    channel_order_id?: string;
    status: string;
    status_code?: number;
    shipments?: Array<{
      id: number;
      awb?: string;
      courier_id?: number;
      courier_name?: string;
    }>;
  }>;
}

/**
 * Reconciles an ambiguous shipment state with Shiprocket.
 *
 * Blueprint Rules:
 * 1. Never assume an empty response or 404 proves an entity does not exist.
 * 2. On confirmed existence in Shiprocket: adopt remote IDs and transition to appropriate forward state.
 * 3. On unconfirmed or ambiguous outcome: retain RECONCILIATION_REQUIRED and require human audit.
 */
export async function reconcileShipment(
  orderId: string,
  client: ShiprocketClient = new ShiprocketClient()
): Promise<ReconcileResult> {
  const order = await Order.findById(orderId);
  if (!order || !order.shipment) {
    throw new ShiprocketValidationError("Order or shipment not found", 404);
  }

  const previousState = order.shipment.shipmentState || "IDLE";
  const lastFailedStep = order.shipment.lastFailedStep;
  const shiprocketOrderId = order.shipment.shiprocketOrderId;

  // Prevent premature reconciliation while an active in-flight operation holds a fresh lock
  if (
    order.shipment.lockTimestamp &&
    Date.now() - new Date(order.shipment.lockTimestamp).getTime() < 5 * 60 * 1000 &&
    order.shipment.shipmentState !== "RECONCILIATION_REQUIRED" &&
    order.shipment.shipmentState !== "FAILED"
  ) {
    throw new ShiprocketValidationError(
      "Cannot reconcile shipment while an active operation is in progress. Wait for lock expiration or operation completion.",
      409
    );
  }

  safeLog("Reconcile", `Reconciling shipment for ${order.orderNumber} (State: ${previousState}, Failed Step: ${lastFailedStep})`);

  let remoteOrder: {
    id: number;
    shipmentId?: number;
    awbCode?: string;
    courierName?: string;
    courierCompanyId?: number;
    statusCode?: number;
  } | null = null;

  // 1. If we have shiprocketOrderId, query directly by ID
  if (shiprocketOrderId) {
    try {
      const showRes = await client.get<ShiprocketShowOrderData>(`/orders/show/${shiprocketOrderId}`);
      if (showRes.data?.id) {
        const d = showRes.data;
        const firstShipment = d.shipments?.[0];
        remoteOrder = {
          id: d.id,
          shipmentId: firstShipment?.id,
          awbCode: d.awb_code || firstShipment?.awb,
          courierName: d.courier_name || firstShipment?.courier_name,
          courierCompanyId: d.courier_company_id || firstShipment?.courier_id,
          statusCode: d.status_code || firstShipment?.status_code,
        };
      }
    } catch (err: unknown) {
      safeWarn("Reconcile", `Direct query for order ${shiprocketOrderId} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. If direct lookup failed or no shiprocketOrderId, search orders list by merchant orderNumber
  if (!remoteOrder) {
    try {
      const listRes = await client.get<ShiprocketListOrdersData>("/orders", {
        params: { search: order.orderNumber },
      });

      const matched = listRes.data?.find((o) => o.channel_order_id === order.orderNumber);
      if (matched) {
        const firstShipment = matched.shipments?.[0];
        remoteOrder = {
          id: matched.id,
          shipmentId: firstShipment?.id,
          awbCode: firstShipment?.awb,
          courierName: firstShipment?.courier_name,
          courierCompanyId: firstShipment?.courier_id,
          statusCode: matched.status_code,
        };
      }
    } catch (err: unknown) {
      safeWarn("Reconcile", `Search query for ${order.orderNumber} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. Evaluate Reconciliation Outcome
  if (remoteOrder) {
    // Confirmed to exist in Shiprocket!
    let nextState: ShipmentState = "ORDER_CREATED";
    const updates: Record<string, unknown> = {
      "shipment.shiprocketOrderId": remoteOrder.id,
      "shipment.lockTimestamp": null,
      "shipment.operationId": null,
      "shipment.requiresReview": false,
      "shipment.lastError": null,
    };

    if (remoteOrder.shipmentId) {
      updates["shipment.shiprocketShipmentId"] = remoteOrder.shipmentId;
    }

    if (remoteOrder.awbCode) {
      updates["shipment.awbCode"] = remoteOrder.awbCode;
      updates["shipment.courierName"] = remoteOrder.courierName;
      updates["shipment.courierCompanyId"] = remoteOrder.courierCompanyId;
      updates["shipment.currentShippingStatus"] = "AWB Assigned";
      nextState = "AWB_ASSIGNED";
    }

    updates["shipment.shipmentState"] = nextState;

    const updatedOrder = await Order.findByIdAndUpdate(orderId, { $set: updates }, { new: true });

    return {
      orderNumber: order.orderNumber,
      previousState,
      newState: nextState,
      reconciled: true,
      message: `Reconciled with Shiprocket. Remote Order ID: ${remoteOrder.id}, State updated to ${nextState}.`,
      order: updatedOrder!,
    };
  }

  // 4. Remote existence NOT confirmed
  // Blueprint rule: retain RECONCILIATION_REQUIRED, require dashboard check before retrying.
  const unconfirmedOrder = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        "shipment.shipmentState": "RECONCILIATION_REQUIRED",
        "shipment.requiresReview": true,
        "shipment.reviewReason":
          "Reconciliation query yielded no confirmed match in Shiprocket. Verify in Shiprocket dashboard before retrying creation.",
      },
    },
    { new: true }
  );

  return {
    orderNumber: order.orderNumber,
    previousState,
    newState: "RECONCILIATION_REQUIRED",
    reconciled: false,
    message: "No conclusive match found in Shiprocket. Order remains in RECONCILIATION_REQUIRED for admin review.",
    order: unconfirmedOrder!,
  };
}

/**
 * Manual administrative force-reset for orders in RECONCILIATION_REQUIRED
 * when the admin has verified the Shiprocket dashboard and confirmed no duplicate order exists.
 *
 * Blueprint Rules:
 * - Requires ADMIN role and detailed audit reason.
 * - Prevents duplicate remote order creation: after ambiguous create-order outcomes,
 *   requires explicit confirmation of remote absence with an evidence reference.
 * - Prevents clearing active uncancelled AWBs.
 * - Does not falsely claim the carrier cancelled the order.
 */
export async function adminForceResetShipment(
  orderId: string,
  adminId: string,
  adminEmail: string,
  reason: string,
  evidence?: {
    confirmRemoteAbsence?: boolean;
    evidenceReference?: string;
  }
): Promise<IOrder> {
  if (!reason || reason.trim().length < 5) {
    throw new ShiprocketValidationError("A specific audit reason (at least 5 characters) is required for manual reset", 400);
  }

  const order = await Order.findById(orderId);
  if (!order || !order.shipment) {
    throw new ShiprocketValidationError("Order not found", 404);
  }

  // Safety Guard 1: Prevent duplicate remote order creation after ambiguous create-order outcomes.
  // If the failure occurred during CREATE_ORDER or without a remote ID, require confirmed remote absence.
  const isAmbiguousCreate =
    order.shipment.lastFailedStep === "CREATE_ORDER" ||
    (!order.shipment.shiprocketOrderId && order.shipment.shipmentState === "RECONCILIATION_REQUIRED");

  if (isAmbiguousCreate) {
    if (!evidence?.confirmRemoteAbsence || !evidence?.evidenceReference || evidence.evidenceReference.trim().length < 3) {
      throw new ShiprocketValidationError(
        "Cannot force-reset after ambiguous order creation without explicit confirmation of remote absence. Conclusive reconciliation or verified dashboard absence proof (with evidenceReference) is required to prevent duplicate remote order creation.",
        400
      );
    }
  }

  // Safety Guard 2: Force reset does not falsely claim remote shipment was cancelled.
  // It cannot clear an active uncancelled AWB, preventing unmonitored live parcels with carriers.
  const isAwbCancelled = order.shipment.awbCancellations?.some(
    (c) => c.awbCode === order.shipment?.awbCode && (c.outcome === "CONFIRMED" || c.outcome === "ADMIN_FORCE_OVERRIDE")
  );
  if (order.shipment.awbCode && !isAwbCancelled) {
    throw new ShiprocketValidationError(
      `Cannot force reset shipment with an active uncancelled AWB (${order.shipment.awbCode}). Cancel the AWB first with the carrier before resetting.`,
      400
    );
  }

  const auditNote = evidence?.evidenceReference
    ? `Administrative force-reset by ${adminEmail}: ${reason} (Evidence: ${evidence.evidenceReference})`
    : `Administrative force-reset by ${adminEmail}: ${reason}`;

  const updated = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        "shipment.shipmentState": "FAILED",
        "shipment.operationId": null,
        "shipment.lockTimestamp": null,
        "shipment.requiresReview": false,
        "shipment.reviewAcknowledgedAt": new Date(),
        "shipment.lastError": auditNote,
      },
      $push: {
        statusHistory: {
          type: "FULFILMENT",
          from: order.shipment.shipmentState,
          to: "FAILED",
          actorType: "ADMIN",
          actorId: adminId,
          reason: `Admin force reset: ${reason}`,
          at: new Date(),
        },
      },
    },
    { new: true }
  );

  return updated!;
}

