import mongoose, { Schema, Document, Model } from "mongoose";

export type PaymentMethod = "RAZORPAY" | "COD";

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
  shipment?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    shippedAt?: Date;
    deliveredAt?: Date;
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
      enum: ["RAZORPAY", "COD"],
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
    stockAppliedAt: { type: Date },
    cancellationReason: { type: String },
    shipment: {
      carrier: { type: String },
      trackingNumber: { type: String },
      trackingUrl: { type: String },
      shippedAt: { type: Date },
      deliveredAt: { type: Date },
    },
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

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
