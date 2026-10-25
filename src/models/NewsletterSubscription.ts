import mongoose, { Schema, Document, Model } from "mongoose";

export interface INewsletterSubscription extends Document {
  email: string;
  status: "ACTIVE" | "UNSUBSCRIBED";
  source: string;
  subscribedAt: Date;
  unsubscribedAt?: Date;
}

const NewsletterSubscriptionSchema = new Schema<INewsletterSubscription>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "UNSUBSCRIBED"],
      default: "ACTIVE",
    },
    source: {
      type: String,
      default: "STOREFRONT_FOOTER",
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
  },
  {
    timestamps: false,
  }
);

export const NewsletterSubscription: Model<INewsletterSubscription> =
  mongoose.models.NewsletterSubscription ||
  mongoose.model<INewsletterSubscription>(
    "NewsletterSubscription",
    NewsletterSubscriptionSchema
  );
