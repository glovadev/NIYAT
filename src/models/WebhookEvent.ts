import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWebhookEvent extends Document {
  provider: "RAZORPAY" | "SHIPROCKET";
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED" | "INCOMPLETE" | "DUPLICATE";
  isBestEffort?: boolean;
  attempts?: number;
  workerId?: string | null;
  leaseExpiresAt?: Date | null;
  fenceVersion?: number;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: { type: String, enum: ["RAZORPAY", "SHIPROCKET"], required: true },
    eventId: { type: String, required: true },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["RECEIVED", "PROCESSING", "PROCESSED", "FAILED", "INCOMPLETE", "DUPLICATE"],
      default: "RECEIVED",
      index: true,
    },
    isBestEffort: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    workerId: { type: String },
    leaseExpiresAt: { type: Date, index: true },
    fenceVersion: { type: Number, default: 0 },
    processedAt: { type: Date },
    error: { type: String },
  },
  {
    timestamps: true,
  }
);

// Enforce provider + eventId uniqueness for safe idempotency
WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
WebhookEventSchema.index({ provider: 1, status: 1, leaseExpiresAt: 1 });

export const WebhookEvent: Model<IWebhookEvent> =
  mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEvent>("WebhookEvent", WebhookEventSchema);
