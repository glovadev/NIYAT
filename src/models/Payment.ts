import mongoose, { Schema, Document, Model } from "mongoose";
import { PaymentStatus } from "./Order";

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  provider: "RAZORPAY" | "COD";
  providerOrderId?: string;
  providerPaymentId?: string;
  amountPaise: number;
  currency: "INR";
  status: PaymentStatus;
  signatureVerified?: boolean;
  failureCode?: string;
  failureDescription?: string;
  paidAt?: Date;
  refundedPaise: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    provider: { type: String, enum: ["RAZORPAY", "COD"], required: true },
    providerOrderId: { type: String, sparse: true, index: true },
    providerPaymentId: { type: String, sparse: true, index: true },
    amountPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", enum: ["INR"] },
    status: {
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
    },
    signatureVerified: { type: Boolean, default: false },
    failureCode: { type: String },
    failureDescription: { type: String },
    paidAt: { type: Date },
    refundedPaise: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ orderId: 1, createdAt: -1 });

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
