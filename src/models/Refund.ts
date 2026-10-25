import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRefund extends Document {
  orderId: mongoose.Types.ObjectId;
  paymentId?: mongoose.Types.ObjectId;
  providerRefundId?: string;
  amountPaise: number;
  status: "PENDING" | "PROCESSED" | "FAILED";
  reason: string;
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    providerRefundId: { type: String, sparse: true, index: true },
    amountPaise: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    reason: { type: String, required: true, trim: true },
    requestedBy: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const Refund: Model<IRefund> =
  mongoose.models.Refund || mongoose.model<IRefund>("Refund", RefundSchema);
