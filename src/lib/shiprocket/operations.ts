import { Order, IOrder, IOrderParcelSpecs } from "@/models/Order";
import { getShiprocketConfig } from "./config";
import { ShiprocketClient } from "./client";
import {
  acquireShipmentLock,
  releaseShipmentLock,
  markReconciliationRequired,
  markShipmentFailed,
} from "./lock";
import {
  ShiprocketError,
  ShiprocketTimeoutError,
  ShiprocketValidationError,
} from "./errors";
import { safeLog, safeError } from "./sanitize";

export interface CreateShiprocketOrderResponse {
  order_id: number;
  shipment_id: number;
  status: string;
  status_code: number;
  onboarding_completed_now?: number;
  awb_code?: string;
  courier_company_id?: number;
  courier_name?: string;
}

export interface AssignAwbResponse {
  awb_assign_status: number;
  response: {
    data: {
      awb_code: string;
      courier_company_id: number;
      courier_name: string;
      shipment_id: number;
    };
  };
}

export interface GenerateLabelResponse {
  label_created: number;
  label_url: string;
  response?: string;
}

export interface SchedulePickupResponse {
  pickup_status: number;
  response: {
    pickup_token_number: string;
    pickup_scheduled_date?: string;
    data?: string;
  };
}

export interface GenerateManifestResponse {
  status: number;
  manifest_url: string;
}

export interface PrintManifestResponse {
  status: number;
  manifest_url: string;
}

function formatShiprocketDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * 1. Create Shipment in Shiprocket
 * Blueprint Rules:
 * - Uses NIYAT orderNumber as deterministic external order_id.
 * - On ambiguous timeout: marks RECONCILIATION_REQUIRED, never repeats creation blindly.
 */
export async function createShiprocketOrder(
  orderId: string,
  parcel: IOrderParcelSpecs,
  pickupLocationOverride?: string,
  client: ShiprocketClient = new ShiprocketClient()
): Promise<IOrder> {
  const lock = await acquireShipmentLock(orderId, "CREATING_ORDER", ["IDLE", "FAILED"]);
  if (!lock.acquired) {
    throw new ShiprocketValidationError(lock.error || "Could not acquire shipment lock", 409);
  }

  const order = lock.order!;
  const config = getShiprocketConfig();
  const pickupLocation = pickupLocationOverride?.trim() || config.defaultPickupLocation || "Primary";

  const payload = {
    order_id: order.orderNumber,
    order_date: formatShiprocketDate(order.createdAt || new Date()),
    pickup_location: pickupLocation,
    billing_customer_name: order.customer.name,
    billing_last_name: "",
    billing_address: order.shippingAddress.addressLine1,
    billing_address_2: order.shippingAddress.addressLine2 || "",
    billing_city: order.shippingAddress.city,
    billing_pincode: order.shippingAddress.postalCode,
    billing_state: order.shippingAddress.state,
    billing_country: "India",
    billing_email: order.customer.email || "customer@niyat.in",
    billing_phone: order.customer.phone,
    shipping_is_billing: true,
    order_items: order.items.map((item) => ({
      name: item.productName,
      sku: item.sku,
      units: item.quantity,
      selling_price: Math.max(1, Math.round(item.unitPricePaise / 100)),
      discount: Math.round(item.discountPaise / 100),
      tax: 0,
    })),
    payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
    sub_total: Math.max(1, Math.round(order.totalPaise / 100)),
    length: parcel.lengthCm,
    breadth: parcel.breadthCm,
    height: parcel.heightCm,
    weight: parseFloat((parcel.weightGrams / 1000).toFixed(3)),
  };

  try {
    safeLog("Operations", `Creating Shiprocket order for ${order.orderNumber}`);
    const res = await client.post<CreateShiprocketOrderResponse>("/orders/create/adhoc", payload, {
      allowRetry: false, // Strict: never retry order creation mutations
    });

    const updated = await releaseShipmentLock(orderId, lock.operationId, "ORDER_CREATED", {
      shiprocketOrderId: res.order_id,
      shiprocketShipmentId: res.shipment_id,
      pickupLocation,
      parcel,
      currentShippingStatus: "Order Created in Shiprocket",
      currentStatusCode: res.status_code || 0,
      awbCode: res.awb_code || undefined,
      courierCompanyId: res.courier_company_id || undefined,
      courierName: res.courier_name || undefined,
    });

    return updated!;
  } catch (err: unknown) {
    if (err instanceof ShiprocketTimeoutError) {
      safeError("Operations", `Order creation timed out for ${order.orderNumber}. Marking RECONCILIATION_REQUIRED.`);
      const reconciledOrder = await markReconciliationRequired(
        orderId,
        lock.operationId,
        "CREATE_ORDER",
        err.message
      );
      return reconciledOrder!;
    }

    const errorMsg = err instanceof Error ? err.message : String(err);
    safeError("Operations", `Order creation failed for ${order.orderNumber}: ${errorMsg}`);
    const failedOrder = await markShipmentFailed(orderId, lock.operationId, "CREATE_ORDER", errorMsg);
    throw err instanceof ShiprocketError ? err : new ShiprocketValidationError(errorMsg, 400);
  }
}

/**
 * 2. Assign AWB to Shipment
 * Blueprint Rules:
 * - Blocked if shipment is in REASSIGNMENT_BLOCKED.
 * - On ambiguous timeout: marks RECONCILIATION_REQUIRED, does not clear lock.
 */
export async function assignAwb(
  orderId: string,
  courierCompanyId: number,
  client: ShiprocketClient = new ShiprocketClient()
): Promise<IOrder> {
  const currentOrder = await Order.findById(orderId);
  if (!currentOrder || !currentOrder.shipment) {
    throw new ShiprocketValidationError("Shipment has not been initialized for this order", 400);
  }

  if (currentOrder.shipment.shipmentState === "REASSIGNMENT_BLOCKED") {
    throw new ShiprocketValidationError(
      "Courier reassignment is blocked. A previous AWB was cancelled and requires two-person administrative override.",
      409
    );
  }

  const shipmentId = currentOrder.shipment.shiprocketShipmentId;
  if (!shipmentId) {
    throw new ShiprocketValidationError("Shiprocket shipment ID is missing. Create the order first.", 400);
  }

  const lock = await acquireShipmentLock(orderId, "ASSIGNING_AWB", ["ORDER_CREATED", "FAILED"]);
  if (!lock.acquired) {
    throw new ShiprocketValidationError(lock.error || "Could not acquire AWB assignment lock", 409);
  }

  try {
    safeLog("Operations", `Assigning courier ${courierCompanyId} to shipment ${shipmentId}`);
    const res = await client.post<AssignAwbResponse>("/courier/assign/awb", {
      shipment_id: shipmentId,
      courier_id: courierCompanyId,
    });

    const data = res.response?.data;
    if (!data?.awb_code) {
      throw new ShiprocketValidationError("Shiprocket did not return an AWB code in assignment response", 502);
    }

    const updated = await releaseShipmentLock(orderId, lock.operationId, "AWB_ASSIGNED", {
      awbCode: data.awb_code,
      courierCompanyId: data.courier_company_id || courierCompanyId,
      courierName: data.courier_name,
      currentShippingStatus: "AWB Assigned",
      currentStatusCode: 1,
    });

    return updated!;
  } catch (err: unknown) {
    if (err instanceof ShiprocketTimeoutError) {
      safeError("Operations", `AWB assignment timed out for ${currentOrder.orderNumber}. Marking RECONCILIATION_REQUIRED.`);
      const reconciled = await markReconciliationRequired(orderId, lock.operationId, "ASSIGN_AWB", err.message);
      return reconciled!;
    }

    const errorMsg = err instanceof Error ? err.message : String(err);
    await markShipmentFailed(orderId, lock.operationId, "ASSIGN_AWB", errorMsg);
    throw err instanceof ShiprocketError ? err : new ShiprocketValidationError(errorMsg, 400);
  }
}

/**
 * 3. Generate Shipping Label
 * Blueprint Rules:
 * - On ambiguous timeout: marks RECONCILIATION_REQUIRED.
 */
export async function generateShippingLabel(
  orderId: string,
  client: ShiprocketClient = new ShiprocketClient()
): Promise<IOrder> {
  const currentOrder = await Order.findById(orderId);
  const shipmentId = currentOrder?.shipment?.shiprocketShipmentId;
  if (!shipmentId) {
    throw new ShiprocketValidationError("Shipment ID missing. Assign AWB before generating label.", 400);
  }

  const lock = await acquireShipmentLock(orderId, "GENERATING_LABEL", ["AWB_ASSIGNED", "FAILED"]);
  if (!lock.acquired) {
    throw new ShiprocketValidationError(lock.error || "Could not acquire label generation lock", 409);
  }

  try {
    safeLog("Operations", `Generating label for shipment ${shipmentId}`);
    const res = await client.post<GenerateLabelResponse>("/courier/generate/label", {
      shipment_id: [shipmentId],
    });

    if (!res.label_url) {
      throw new ShiprocketValidationError("Shiprocket did not return a label URL", 502);
    }

    const updated = await releaseShipmentLock(orderId, lock.operationId, "LABEL_GENERATED", {
      labelUrl: res.label_url,
      currentShippingStatus: "Label Generated",
      currentStatusCode: 2,
    });

    return updated!;
  } catch (err: unknown) {
    if (err instanceof ShiprocketTimeoutError) {
      const reconciled = await markReconciliationRequired(orderId, lock.operationId, "GENERATE_LABEL", err.message);
      return reconciled!;
    }

    const errorMsg = err instanceof Error ? err.message : String(err);
    await markShipmentFailed(orderId, lock.operationId, "GENERATE_LABEL", errorMsg);
    throw err instanceof ShiprocketError ? err : new ShiprocketValidationError(errorMsg, 400);
  }
}

/**
 * 4. Schedule Courier Pickup
 */
export async function scheduleCourierPickup(
  orderId: string,
  pickupDateOverride?: string,
  client: ShiprocketClient = new ShiprocketClient()
): Promise<IOrder> {
  const currentOrder = await Order.findById(orderId);
  const shipmentId = currentOrder?.shipment?.shiprocketShipmentId;
  if (!shipmentId) {
    throw new ShiprocketValidationError("Shipment ID missing. Generate label before scheduling pickup.", 400);
  }

  const lock = await acquireShipmentLock(orderId, "SCHEDULING_PICKUP", ["LABEL_GENERATED", "FAILED"]);
  if (!lock.acquired) {
    throw new ShiprocketValidationError(lock.error || "Could not acquire pickup scheduling lock", 409);
  }

  try {
    safeLog("Operations", `Scheduling pickup for shipment ${shipmentId}`);
    const res = await client.post<SchedulePickupResponse>("/courier/generate/pickup", {
      shipment_id: [shipmentId],
      pickup_date: pickupDateOverride,
    });

    const tokenNumber = res.response?.pickup_token_number;
    const scheduledDate = res.response?.pickup_scheduled_date
      ? new Date(res.response.pickup_scheduled_date)
      : new Date();

    const updated = await releaseShipmentLock(orderId, lock.operationId, "PICKUP_SCHEDULED", {
      pickupTokenNumber: tokenNumber,
      pickupScheduledDate: scheduledDate,
      currentShippingStatus: "Pickup Scheduled",
      currentStatusCode: 3,
    });

    return updated!;
  } catch (err: unknown) {
    if (err instanceof ShiprocketTimeoutError) {
      const reconciled = await markReconciliationRequired(orderId, lock.operationId, "SCHEDULE_PICKUP", err.message);
      return reconciled!;
    }

    const errorMsg = err instanceof Error ? err.message : String(err);
    await markShipmentFailed(orderId, lock.operationId, "SCHEDULE_PICKUP", errorMsg);
    throw err instanceof ShiprocketError ? err : new ShiprocketValidationError(errorMsg, 400);
  }
}

/**
 * 5. Generate Manifest
 */
export async function generateManifest(
  orderId: string,
  client: ShiprocketClient = new ShiprocketClient()
): Promise<IOrder> {
  const currentOrder = await Order.findById(orderId);
  const shipmentId = currentOrder?.shipment?.shiprocketShipmentId;
  if (!shipmentId) {
    throw new ShiprocketValidationError("Shipment ID missing. Schedule pickup before generating manifest.", 400);
  }

  const lock = await acquireShipmentLock(orderId, "MANIFEST_GENERATING", ["PICKUP_SCHEDULED", "FAILED"]);
  if (!lock.acquired) {
    throw new ShiprocketValidationError(lock.error || "Could not acquire manifest generation lock", 409);
  }

  try {
    safeLog("Operations", `Generating manifest for shipment ${shipmentId}`);
    const res = await client.post<GenerateManifestResponse>("/manifests/generate", {
      shipment_id: [shipmentId],
    });

    if (!res.manifest_url) {
      throw new ShiprocketValidationError("Shiprocket did not return a manifest URL", 502);
    }

    const updated = await releaseShipmentLock(orderId, lock.operationId, "LOGISTICS_READY", {
      manifestUrl: res.manifest_url,
      currentShippingStatus: "Manifest Generated - Ready for Handover",
      currentStatusCode: 3,
    });

    return updated!;
  } catch (err: unknown) {
    if (err instanceof ShiprocketTimeoutError) {
      const reconciled = await markReconciliationRequired(orderId, lock.operationId, "GENERATE_MANIFEST", err.message);
      return reconciled!;
    }

    const errorMsg = err instanceof Error ? err.message : String(err);
    await markShipmentFailed(orderId, lock.operationId, "GENERATE_MANIFEST", errorMsg);
    throw err instanceof ShiprocketError ? err : new ShiprocketValidationError(errorMsg, 400);
  }
}

/**
 * 6. Print Manifest (Read-only document retrieval, distinct from manifest generation)
 */
export async function printManifest(
  orderId: string,
  client: ShiprocketClient = new ShiprocketClient()
): Promise<{ manifestUrl: string }> {
  const currentOrder = await Order.findById(orderId);
  const shiprocketOrderId = currentOrder?.shipment?.shiprocketOrderId;
  if (!shiprocketOrderId) {
    throw new ShiprocketValidationError("Shiprocket order ID missing. Manifest must be generated first.", 400);
  }

  // Guard: printManifest cannot establish that a manifest was generated.
  // It is strictly a read-only printing retrieval for already-generated manifests.
  if (!currentOrder?.shipment?.manifestUrl && currentOrder?.shipment?.shipmentState !== "LOGISTICS_READY") {
    throw new ShiprocketValidationError(
      "Manifest has not been generated for this shipment. Manifest must be generated before printing.",
      400
    );
  }

  const res = await client.post<PrintManifestResponse>("/manifests/print", {
    order_ids: [shiprocketOrderId],
  });

  if (!res.manifest_url) {
    throw new ShiprocketValidationError("Shiprocket did not return a printable manifest URL", 502);
  }

  return { manifestUrl: res.manifest_url };
}

