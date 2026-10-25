import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWebhookEvent extends Document {
  provider: "RAZORPAY";
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "RECEIVED" | "PROCESSED" | "FAILED" | "DUPLICATE";
  processedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: { type: String, enum: ["RAZORPAY"], required: true },
    eventId: { type: String, required: true },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["RECEIVED", "PROCESSED", "FAILED", "DUPLICATE"],
      default: "RECEIVED",
      index: true,
    },
    processedAt: { type: Date },
    error: { type: String },
  },
  {
    timestamps: true,
  }
);

// Enforce provider + eventId uniqueness for safe idempotency
WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const WebhookEvent: Model<IWebhookEvent> =
  mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEvent>("WebhookEvent", WebhookEventSchema);
