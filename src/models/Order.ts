import mongoose, { Schema, Document, Model } from "mongoose";

export type PaymentMethod = "RAZORPAY" | "COD" | "BANK_TRANSFER";

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

export type FulfilmentStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PROCESSING"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLATION_REQUESTED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURNED";

export type ShipmentState =
  | "IDLE"
  | "CREATING_ORDER"
  | "ORDER_CREATED"
  | "ASSIGNING_AWB"
  | "AWB_ASSIGNED"
  | "GENERATING_LABEL"
  | "LABEL_GENERATED"
  | "SCHEDULING_PICKUP"
  | "PICKUP_SCHEDULED"
  | "MANIFEST_GENERATING"
  | "MANIFEST_GENERATED"
  | "LOGISTICS_READY"
  | "FAILED"
  | "RECONCILIATION_REQUIRED"
  | "REASSIGNMENT_BLOCKED";

export interface IOrderParcelSpecs {
  weightGrams: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}

export interface IOrderTrackingActivity {
  scanKey: string;
  date: string;
  status: string;
  activity: string;
  location: string;
  srStatusCode?: number;
}

export interface ICarrierCancellationEvent {
  incidentKey: string;
  isBestEffort: boolean;
  originatingWebhookEventId?: string;
  receivedAt: Date;
  rawActivity: string;
  sourceStatusId: 8;
  shipmentStateAtCancellation: ShipmentState;
  awbCode: string;
  resolved: boolean;
  resolution?: {
    action: "REASSIGN_COURIER" | "CANCEL_CUSTOMER_ORDER" | "DISMISS";
    resolvedAt: Date;
    resolvedByAdminId: string;
    resolvedByAdminEmail: string;
    reason: string;
  };
}

export interface IAwbCancellationRecord {
  cancellationId?: string;
  awbCode: string;
  requestedAt: Date;
  outcome: "CONFIRMED" | "REJECTED_BY_CARRIER" | "PENDING_VERIFICATION" | "ADMIN_FORCE_OVERRIDE";
  carrierResponse?: string;
  resolvedAt?: Date;
  actingAdminId?: string;
  actingAdminEmail?: string;
  approvingAdminId?: string;
  approvingAdminEmail?: string;
  evidenceReference?: string;
  overrideReason?: string;
}

export interface IEmergencyOverrideRequest {
  requesterAdminId: string;
  requesterAdminEmail: string;
  requestedAt: Date;
  reason: string;
  evidenceReference: string;
  targetAwbCode?: string;
  targetCancellationId?: string;
  reviewIncidentId?: string;
  shipmentStateAtRequest?: ShipmentState;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  reviewedAt?: Date;
  reviewerAdminId?: string;
  reviewerAdminEmail?: string;
  reviewNote?: string;
}

export interface IOrderShipment {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: Date;
  deliveredAt?: Date;

  shiprocketOrderId?: number;
  shiprocketShipmentId?: number;
  courierCompanyId?: number;
  courierName?: string;
  awbCode?: string;

  labelUrl?: string;
  manifestUrl?: string;

  pickupLocation?: string;
  pickupScheduledDate?: Date;
  pickupTokenNumber?: string;

  currentShippingStatus?: string;
  currentStatusCode?: number;
  estimatedDeliveryDate?: Date;
  trackingActivities?: IOrderTrackingActivity[];

  parcel?: IOrderParcelSpecs;

  shipmentState?: ShipmentState;
  operationId?: string;
  lockTimestamp?: Date;
  lastFailedStep?:
    | "CREATE_ORDER"
    | "ASSIGN_AWB"
    | "GENERATE_LABEL"
    | "SCHEDULE_PICKUP"
    | "GENERATE_MANIFEST";
  lastError?: string;

  carrierCancellations?: ICarrierCancellationEvent[];
  awbCancellations?: IAwbCancellationRecord[];
  overrideRequest?: IEmergencyOverrideRequest;

  requiresReview?: boolean;
  reviewReason?: string;
  reviewIncidentId?: string;
  reviewCategory?:
    | "REASSIGNMENT_BLOCKED"
    | "TIMEOUT_RECONCILIATION"
    | "DAMAGED_PACKAGE"
    | "CARRIER_EXCEPTION"
    | "CUSTOMER_DISPUTE"
    | "INCOMPLETE_WEBHOOK"
    | "CARRIER_CANCELLATION"
    | "OTHER";
  reviewAcknowledgedAt?: Date;
}

export interface IOrderItemSnapshot {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  sizeLabel: string;
  imageUrl?: string;
  unitPricePaise: number;
  quantity: number;
  discountPaise: number;
  lineTotalPaise: number;
}

export interface IOrderAddressSnapshot {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: "IN";
}

export interface IOrderStatusHistory {
  type: "PAYMENT" | "FULFILMENT";
  from?: string;
  to: string;
  actorType: "SYSTEM" | "CUSTOMER" | "ADMIN" | "WEBHOOK";
  actorId?: string;
  reason?: string;
  at: Date;
}

export interface IOrder extends Document {
  orderNumber: string; // e.g. NIY-2026-000001
  userId?: mongoose.Types.ObjectId; // Nullable for guest checkouts
  customer: {
    name: string;
    email?: string;
    phone: string;
  };
  items: IOrderItemSnapshot[];
  shippingAddress: IOrderAddressSnapshot;
  billingAddress?: IOrderAddressSnapshot;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: "INR";
  coupon?: {
    code: string;
    discountPaise: number;
  };
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  stockAppliedAt?: Date;
  cancellationReason?: string;
  shipment?: IOrderShipment;
  stockRestorationState?: "NOT_APPLIED" | "PENDING" | "PARTIALLY_RESTORED" | "COMPLETED";
  stockRestorationWorkerId?: string;
  stockRestorationLeaseExpiresAt?: Date;
  stockRestorationStartedAt?: Date;
  stockRestoredAt?: Date;
  lastRestorationError?: string;
  isDistributorOrder?: boolean;
  distributorInfo?: {
    companyName?: string;
    gstNumber?: string;
    poNumber?: string;
  };
  statusHistory: IOrderStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    sizeLabel: { type: String, required: true },
    imageUrl: { type: String },
    unitPricePaise: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    discountPaise: { type: Number, default: 0, min: 0 },
    lineTotalPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderAddressSnapshotSchema = new Schema<IOrderAddressSnapshot>(
  {
    recipientName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: "IN" },
  },
  { _id: false }
);

const OrderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    type: { type: String, enum: ["PAYMENT", "FULFILMENT"], required: true },
    from: { type: String },
    to: { type: String, required: true },
    actorType: {
      type: String,
      enum: ["SYSTEM", "CUSTOMER", "ADMIN", "WEBHOOK"],
      required: true,
    },
    actorId: { type: String },
    reason: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderParcelSpecsSchema = new Schema<IOrderParcelSpecs>(
  {
    weightGrams: {
      type: Number,
      required: true,
      min: [10, "Weight must be at least 10 grams"],
      max: [50000, "Weight cannot exceed 50,000 grams (50 kg)"],
      validate: {
        validator: Number.isInteger,
        message: "Weight must be an integer in grams",
      },
    },
    lengthCm: { type: Number, required: true, min: [0.5, "Length must be at least 0.5 cm"], max: 200 },
    breadthCm: { type: Number, required: true, min: [0.5, "Breadth must be at least 0.5 cm"], max: 200 },
    heightCm: { type: Number, required: true, min: [0.5, "Height must be at least 0.5 cm"], max: 200 },
  },
  { _id: false }
);

const OrderTrackingActivitySchema = new Schema<IOrderTrackingActivity>(
  {
    scanKey: { type: String, required: true },
    date: { type: String, required: true },
    status: { type: String, required: true },
    activity: { type: String, required: true },
    location: { type: String, default: "" },
    srStatusCode: { type: Number },
  },
  { _id: false }
);

const CarrierCancellationEventSchema = new Schema<ICarrierCancellationEvent>(
  {
    incidentKey: { type: String, required: true },
    isBestEffort: { type: Boolean, default: false },
    originatingWebhookEventId: { type: String },
    receivedAt: { type: Date, default: Date.now },
    rawActivity: { type: String, default: "" },
    sourceStatusId: { type: Number, default: 8 },
    shipmentStateAtCancellation: { type: String, required: true },
    awbCode: { type: String, required: true },
    resolved: { type: Boolean, default: false },
    resolution: {
      action: { type: String, enum: ["REASSIGN_COURIER", "CANCEL_CUSTOMER_ORDER", "DISMISS"] },
      resolvedAt: { type: Date },
      resolvedByAdminId: { type: String },
      resolvedByAdminEmail: { type: String },
      reason: { type: String },
    },
  },
  { _id: false }
);

const AwbCancellationRecordSchema = new Schema<IAwbCancellationRecord>(
  {
    cancellationId: { type: String },
    awbCode: { type: String, required: true },
    requestedAt: { type: Date, default: Date.now },
    outcome: {
      type: String,
      enum: ["CONFIRMED", "REJECTED_BY_CARRIER", "PENDING_VERIFICATION", "ADMIN_FORCE_OVERRIDE"],
      required: true,
    },
    carrierResponse: { type: String },
    resolvedAt: { type: Date },
    actingAdminId: { type: String },
    actingAdminEmail: { type: String },
    approvingAdminId: { type: String },
    approvingAdminEmail: { type: String },
    evidenceReference: { type: String },
    overrideReason: { type: String },
  },
  { _id: false }
);

const EmergencyOverrideRequestSchema = new Schema<IEmergencyOverrideRequest>(
  {
    requesterAdminId: { type: String, required: true },
    requesterAdminEmail: { type: String, required: true },
    requestedAt: { type: Date, default: Date.now },
    reason: { type: String, required: true },
    evidenceReference: { type: String, required: true },
    targetAwbCode: { type: String },
    targetCancellationId: { type: String },
    reviewIncidentId: { type: String },
    shipmentStateAtRequest: { type: String },
    status: {
      type: String,
      enum: ["PENDING_APPROVAL", "APPROVED", "REJECTED"],
      default: "PENDING_APPROVAL",
    },
    reviewedAt: { type: Date },
    reviewerAdminId: { type: String },
    reviewerAdminEmail: { type: String },
    reviewNote: { type: String },
  },
  { _id: false }
);

const OrderShipmentSchema = new Schema<IOrderShipment>(
  {
    carrier: { type: String },
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },

    shiprocketOrderId: { type: Number },
    shiprocketShipmentId: { type: Number },
    courierCompanyId: { type: Number },
    courierName: { type: String },
    awbCode: { type: String },

    labelUrl: { type: String },
    manifestUrl: { type: String },

    pickupLocation: { type: String },
    pickupScheduledDate: { type: Date },
    pickupTokenNumber: { type: String },

    currentShippingStatus: { type: String },
    currentStatusCode: { type: Number },
    estimatedDeliveryDate: { type: Date },
    trackingActivities: { type: [OrderTrackingActivitySchema], default: [] },

    parcel: { type: OrderParcelSpecsSchema },

    shipmentState: {
      type: String,
      enum: [
        "IDLE",
        "CREATING_ORDER",
        "ORDER_CREATED",
        "ASSIGNING_AWB",
        "AWB_ASSIGNED",
        "GENERATING_LABEL",
        "LABEL_GENERATED",
        "SCHEDULING_PICKUP",
        "PICKUP_SCHEDULED",
        "MANIFEST_GENERATING",
        "MANIFEST_GENERATED",
        "LOGISTICS_READY",
        "FAILED",
        "RECONCILIATION_REQUIRED",
        "REASSIGNMENT_BLOCKED",
      ],
      default: "IDLE",
    },
    operationId: { type: String },
    lockTimestamp: { type: Date },
    lastFailedStep: {
      type: String,
      enum: [
        "CREATE_ORDER",
        "ASSIGN_AWB",
        "GENERATE_LABEL",
        "SCHEDULE_PICKUP",
        "GENERATE_MANIFEST",
      ],
    },
    lastError: { type: String },

    carrierCancellations: { type: [CarrierCancellationEventSchema], default: [] },
    awbCancellations: { type: [AwbCancellationRecordSchema], default: [] },
    overrideRequest: { type: EmergencyOverrideRequestSchema },

    requiresReview: { type: Boolean, default: false },
    reviewReason: { type: String },
    reviewIncidentId: { type: String },
    reviewCategory: { type: String },
    reviewAcknowledgedAt: { type: Date },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "UserProfile", index: true },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
    },
    items: { type: [OrderItemSnapshotSchema], required: true },
    shippingAddress: { type: OrderAddressSnapshotSchema, required: true },
    billingAddress: { type: OrderAddressSnapshotSchema },
    subtotalPaise: { type: Number, required: true, min: 0 },
    discountPaise: { type: Number, default: 0, min: 0 },
    shippingPaise: { type: Number, default: 0, min: 0 },
    taxPaise: { type: Number, default: 0, min: 0 },
    totalPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", enum: ["INR"] },
    coupon: {
      code: { type: String, uppercase: true },
      discountPaise: { type: Number, min: 0 },
    },
    paymentMethod: {
      type: String,
      enum: ["RAZORPAY", "COD", "BANK_TRANSFER"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        "CREATED",
        "PENDING",
        "AUTHORIZED",
        "PAID",
        "FAILED",
        "CANCELLED",
        "REFUND_PENDING",
        "PARTIALLY_REFUNDED",
        "REFUNDED",
      ],
      default: "PENDING",
      index: true,
    },
    fulfilmentStatus: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "CONFIRMED",
        "PROCESSING",
        "PACKED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLATION_REQUESTED",
        "CANCELLED",
        "RETURN_REQUESTED",
        "RETURNED",
      ],
      default: "PENDING_PAYMENT",
      index: true,
    },
    isDistributorOrder: { type: Boolean, default: false, index: true },
    distributorInfo: {
      companyName: { type: String, trim: true },
      gstNumber: { type: String, trim: true },
      poNumber: { type: String, trim: true },
    },
    stockAppliedAt: { type: Date },
    cancellationReason: { type: String },
    shipment: { type: OrderShipmentSchema, default: null },
    stockRestorationState: {
      type: String,
      enum: ["NOT_APPLIED", "PENDING", "PARTIALLY_RESTORED", "COMPLETED"],
      default: "NOT_APPLIED",
    },
    stockRestorationWorkerId: { type: String },
    stockRestorationLeaseExpiresAt: { type: Date },
    stockRestorationStartedAt: { type: Date },
    stockRestoredAt: { type: Date },
    lastRestorationError: { type: String },
    statusHistory: { type: [OrderStatusHistorySchema], default: [] },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ fulfilmentStatus: 1, createdAt: -1 });
OrderSchema.index({ "customer.phone": 1, createdAt: -1 });
OrderSchema.index({ "shipment.awbCode": 1 }, { sparse: true });
OrderSchema.index({ "shipment.shiprocketOrderId": 1 }, { sparse: true });
OrderSchema.index({ "shipment.shiprocketShipmentId": 1 }, { sparse: true });
OrderSchema.index({ "shipment.shipmentState": 1 }, { sparse: true });
OrderSchema.index({ "shipment.requiresReview": 1 }, { sparse: true });
OrderSchema.index(
  { stockRestorationState: 1, stockRestorationLeaseExpiresAt: 1 },
  { sparse: true }
);

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
