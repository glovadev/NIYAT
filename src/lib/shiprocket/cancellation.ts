import crypto from "crypto";
import { Order, IOrder } from "@/models/Order";
import { ShiprocketClient } from "./client";
import { ShiprocketValidationError } from "./errors";
import { safeLog, safeWarn, safeError } from "./sanitize";

export interface CancelAwbResponse {
  status: number;
  message?: string;
  response?: string;
}

/**
 * 1. Cancel an AWB with Shiprocket and block subsequent courier reassignment.
 *
 * Blueprint Rules:
 * - Assigns a unique cancellationId to bind future override requests.
 * - Records cancellation attempt in awbCancellations audit ledger.
 * - Transitions order to REASSIGNMENT_BLOCKED with structured review category.
 */
export async function cancelAwbShipment(
  orderId: string,
  adminId: string,
  adminEmail: string,
  reason: string,
  client: ShiprocketClient = new ShiprocketClient()
): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order || !order.shipment || !order.shipment.awbCode) {
    throw new ShiprocketValidationError("Order does not have an active AWB to cancel", 400);
  }

  const awbCode = order.shipment.awbCode;
  const cancellationId = `cxl_${crypto.randomUUID().slice(0, 12)}`;
  safeLog("Cancellation", `Cancelling AWB ${awbCode} for order ${order.orderNumber} (Incident: ${cancellationId})`);

  let outcome: "CONFIRMED" | "REJECTED_BY_CARRIER" = "CONFIRMED";
  let carrierResponse = "";

  try {
    const res = await client.post<CancelAwbResponse>("/orders/cancel/shipment/awbs", {
      awbs: [awbCode],
    });
    carrierResponse = res.message || res.response || "Cancellation request accepted";
  } catch (err: unknown) {
    outcome = "REJECTED_BY_CARRIER";
    carrierResponse = err instanceof Error ? err.message : String(err);
    safeError("Cancellation", `AWB cancellation failed for ${awbCode}: ${carrierResponse}`);
  }

  const updated = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        "shipment.shipmentState": "REASSIGNMENT_BLOCKED",
        "shipment.requiresReview": true,
        "shipment.reviewCategory": "REASSIGNMENT_BLOCKED",
        "shipment.reviewIncidentId": cancellationId,
        "shipment.reviewReason": `AWB ${awbCode} cancelled (${outcome}). Reassignment blocked until administrative review.`,
      },
      $push: {
        "shipment.awbCancellations": {
          cancellationId,
          awbCode,
          requestedAt: new Date(),
          outcome,
          carrierResponse,
          actingAdminId: adminId,
          actingAdminEmail: adminEmail,
          overrideReason: reason,
        },
      },
    },
    { new: true }
  );

  return updated!;
}

/**
 * 2. Submit an Emergency Override Request to unblock courier reassignment.
 * Binds the request to the exact cancellation record and structured review incident.
 */
export async function requestEmergencyOverride(
  orderId: string,
  requesterAdminId: string,
  requesterAdminEmail: string,
  reason: string,
  evidenceReference: string,
  targetCancellationId?: string,
  reviewIncidentId?: string
): Promise<IOrder> {
  if (!reason || reason.trim().length < 5) {
    throw new ShiprocketValidationError("A detailed justification reason (at least 5 characters) is required", 400);
  }
  if (!evidenceReference || evidenceReference.trim().length < 3) {
    throw new ShiprocketValidationError("An evidence reference (e.g. support ticket or email ID) is required", 400);
  }

  const order = await Order.findById(orderId);
  if (!order || !order.shipment) {
    throw new ShiprocketValidationError("Order or shipment not found", 404);
  }

  if (order.shipment.shipmentState !== "REASSIGNMENT_BLOCKED") {
    throw new ShiprocketValidationError(
      `Override requests can only be filed when order is in REASSIGNMENT_BLOCKED (current: ${order.shipment.shipmentState})`,
      400
    );
  }

  // 1. Determine and validate active review incident
  const activeReviewIncidentId = order.shipment.reviewIncidentId;
  if (reviewIncidentId && activeReviewIncidentId && reviewIncidentId !== activeReviewIncidentId) {
    throw new ShiprocketValidationError(
      `Specified reviewIncidentId '${reviewIncidentId}' does not match active review incident '${activeReviewIncidentId}'`,
      400
    );
  }
  const boundReviewIncidentId = reviewIncidentId || activeReviewIncidentId;

  // 2. Determine and validate matching cancellation record
  const targetAwbCode = order.shipment.awbCode || order.shipment.awbCancellations?.slice(-1)[0]?.awbCode || "";

  // Find matching AWB cancellation or carrier cancellation
  const matchingAwb = order.shipment.awbCancellations?.find((c) =>
    targetCancellationId
      ? c.cancellationId === targetCancellationId
      : c.awbCode === targetAwbCode || (boundReviewIncidentId && c.cancellationId === boundReviewIncidentId)
  );

  const matchingCarrier = !matchingAwb
    ? order.shipment.carrierCancellations?.find((c) =>
        targetCancellationId
          ? c.incidentKey === targetCancellationId
          : boundReviewIncidentId && c.incidentKey === boundReviewIncidentId
      )
    : undefined;

  if (targetCancellationId && !matchingAwb && !matchingCarrier) {
    throw new ShiprocketValidationError(
      `Target cancellation ID '${targetCancellationId}' not found in order cancellation history`,
      400
    );
  }

  const boundCancellationId =
    targetCancellationId ||
    matchingAwb?.cancellationId ||
    matchingCarrier?.incidentKey ||
    boundReviewIncidentId ||
    `cxl_${crypto.randomUUID().slice(0, 12)}`;

  const finalReviewIncidentId = boundReviewIncidentId || boundCancellationId;

  const updated = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        "shipment.overrideRequest": {
          requesterAdminId,
          requesterAdminEmail,
          requestedAt: new Date(),
          reason: reason.trim(),
          evidenceReference: evidenceReference.trim(),
          targetAwbCode,
          targetCancellationId: boundCancellationId,
          reviewIncidentId: finalReviewIncidentId,
          shipmentStateAtRequest: order.shipment.shipmentState,
          status: "PENDING_APPROVAL",
        },
      },
    },
    { new: true }
  );

  return updated!;
}

/**
 * 3. Approve an Emergency Override Request via ATOMIC conditional update.
 *
 * Strict Security Guard (Two-Person Rule):
 * - Requester admin and Reviewer admin MUST be distinct individuals!
 * - Validates in atomic query: status === PENDING_APPROVAL, expected shipment state, exact target AWB, cancellation record.
 * - Selectively preserves unrelated requiresReview flags using structured review incident identifiers.
 */
export async function approveEmergencyOverride(
  orderId: string,
  reviewerAdminId: string,
  reviewerAdminEmail: string,
  reviewNote?: string
): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order || !order.shipment || !order.shipment.overrideRequest) {
    throw new ShiprocketValidationError("No pending override request found for this order", 404);
  }

  const overrideReq = order.shipment.overrideRequest;
  if (overrideReq.status !== "PENDING_APPROVAL") {
    throw new ShiprocketValidationError(`Override request is already ${overrideReq.status}`, 400);
  }

  // 1. Two-Person Rule Check
  if (overrideReq.requesterAdminId === reviewerAdminId) {
    throw new ShiprocketValidationError(
      "Approval rejected: Two-person rule requires that the approving administrator be distinct from the requester",
      403
    );
  }

  // 2. Pre-flight state drift & incident binding checks
  if (overrideReq.shipmentStateAtRequest && order.shipment.shipmentState !== overrideReq.shipmentStateAtRequest) {
    throw new ShiprocketValidationError(
      `Approval rejected: Shipment state has changed from '${overrideReq.shipmentStateAtRequest}' to '${order.shipment.shipmentState}' since the override was requested`,
      409
    );
  }

  if (overrideReq.targetAwbCode && order.shipment.awbCode && order.shipment.awbCode !== overrideReq.targetAwbCode) {
    throw new ShiprocketValidationError(
      `Approval rejected: Active AWB code '${order.shipment.awbCode}' does not match target AWB '${overrideReq.targetAwbCode}' in override request`,
      409
    );
  }

  // Pre-flight check: Exact review incident must still be active
  if (overrideReq.reviewIncidentId && order.shipment.reviewIncidentId !== overrideReq.reviewIncidentId) {
    throw new ShiprocketValidationError(
      `Approval rejected: Active review incident '${order.shipment.reviewIncidentId || "NONE"}' does not match requested incident '${overrideReq.reviewIncidentId}'. The request is superseded or stale.`,
      409
    );
  }

  // Pre-flight check: Exact cancellation record must still exist
  if (overrideReq.targetCancellationId) {
    const hasAwbCxl = order.shipment.awbCancellations?.some(
      (c) => c.cancellationId === overrideReq.targetCancellationId
    );
    const hasCarrierCxl = order.shipment.carrierCancellations?.some(
      (c) => c.incidentKey === overrideReq.targetCancellationId
    );
    if (!hasAwbCxl && !hasCarrierCxl) {
      throw new ShiprocketValidationError(
        `Approval rejected: Target cancellation record '${overrideReq.targetCancellationId}' not found in order history.`,
        409
      );
    }
  }

  // 3. Build Atomic Query Filter (guarantees race-proof conditional transition bound to exact incident)
  const atomicFilter: Record<string, unknown> = {
    _id: orderId,
    "shipment.overrideRequest.status": "PENDING_APPROVAL",
    "shipment.overrideRequest.requesterAdminId": { $ne: reviewerAdminId },
    "shipment.overrideRequest.requestedAt": overrideReq.requestedAt,
  };

  if (overrideReq.shipmentStateAtRequest) {
    atomicFilter["shipment.shipmentState"] = overrideReq.shipmentStateAtRequest;
  }

  if (overrideReq.reviewIncidentId) {
    atomicFilter["shipment.overrideRequest.reviewIncidentId"] = overrideReq.reviewIncidentId;
    atomicFilter["shipment.reviewIncidentId"] = overrideReq.reviewIncidentId;
  }

  if (overrideReq.targetAwbCode) {
    atomicFilter["shipment.overrideRequest.targetAwbCode"] = overrideReq.targetAwbCode;
  }

  if (overrideReq.targetCancellationId) {
    atomicFilter["shipment.overrideRequest.targetCancellationId"] = overrideReq.targetCancellationId;
    atomicFilter.$or = [
      {
        "shipment.awbCancellations": {
          $elemMatch: {
            cancellationId: overrideReq.targetCancellationId,
            ...(overrideReq.targetAwbCode ? { awbCode: overrideReq.targetAwbCode } : {}),
          },
        },
      },
      {
        "shipment.carrierCancellations": {
          $elemMatch: {
            incidentKey: overrideReq.targetCancellationId,
          },
        },
      },
    ];
  }

  // 4. Structured review flag clearing:
  // Only clear review if the active incident matches the override request's bound incident AND is cancellation-related.
  // Unrelated review incidents (e.g. DAMAGED_PACKAGE, CUSTOMER_DISPUTE) MUST remain active!
  const isCancellationCategory =
    order.shipment.reviewCategory === "REASSIGNMENT_BLOCKED" ||
    order.shipment.reviewCategory === "CARRIER_CANCELLATION" ||
    !order.shipment.reviewCategory;

  const shouldClearReview =
    isCancellationCategory &&
    Boolean(overrideReq.reviewIncidentId) &&
    order.shipment.reviewIncidentId === overrideReq.reviewIncidentId;

  const updateSet: Record<string, unknown> = {
    "shipment.overrideRequest.status": "APPROVED",
    "shipment.overrideRequest.reviewedAt": new Date(),
    "shipment.overrideRequest.reviewerAdminId": reviewerAdminId,
    "shipment.overrideRequest.reviewerAdminEmail": reviewerAdminEmail,
    "shipment.overrideRequest.reviewNote": reviewNote?.trim(),
    "shipment.shipmentState": "ORDER_CREATED", // Unblocks courier assignment
    "shipment.awbCode": null, // Reset previous cancelled AWB
  };

  if (shouldClearReview) {
    updateSet["shipment.requiresReview"] = false;
    updateSet["shipment.reviewCategory"] = null;
    updateSet["shipment.reviewIncidentId"] = null;
  } else {
    safeWarn(
      "Cancellation",
      `Preserving unrelated review incident '${order.shipment.reviewIncidentId}' (${order.shipment.reviewCategory}) during override approval.`
    );
  }

  const updated = await Order.findOneAndUpdate(
    atomicFilter,
    {
      $set: updateSet,
      $push: {
        "shipment.awbCancellations": {
          cancellationId: overrideReq.targetCancellationId || `cxl_${crypto.randomUUID().slice(0, 12)}`,
          awbCode: overrideReq.targetAwbCode || order.shipment.awbCode || "OVERRIDE",
          requestedAt: overrideReq.requestedAt,
          outcome: "ADMIN_FORCE_OVERRIDE",
          resolvedAt: new Date(),
          actingAdminId: overrideReq.requesterAdminId,
          actingAdminEmail: overrideReq.requesterAdminEmail,
          approvingAdminId: reviewerAdminId,
          approvingAdminEmail: reviewerAdminEmail,
          evidenceReference: overrideReq.evidenceReference,
          overrideReason: overrideReq.reason,
        },
        statusHistory: {
          type: "FULFILMENT",
          from: order.shipment.shipmentState,
          to: "ORDER_CREATED",
          actorType: "ADMIN",
          actorId: reviewerAdminId,
          reason: `Emergency override approved by ${reviewerAdminEmail}. Reason: ${overrideReq.reason}`,
          at: new Date(),
        },
      },
    },
    { new: true }
  );

  if (!updated) {
    throw new ShiprocketValidationError(
      "Approval rejected: Atomic condition failed. The override request is stale, has been superseded, or the cancellation incident is no longer active.",
      409
    );
  }

  return updated;
}

