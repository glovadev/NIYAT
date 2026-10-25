import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReview extends Document {
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  rating: number; // 1 to 5
  title?: string;
  body: string;
  verificationStatus: "VERIFIED_PURCHASE" | "UNVERIFIED";
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
  moderatedAt?: Date;
  moderatedBy?: string;
  moderationNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true },
    body: { type: String, required: true, trim: true },
    verificationStatus: {
      type: String,
      enum: ["VERIFIED_PURCHASE", "UNVERIFIED"],
      default: "VERIFIED_PURCHASE",
    },
    moderationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    moderatedAt: { type: Date },
    moderatedBy: { type: String },
    moderationNote: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate review submissions for the same order and product by the same user
ReviewSchema.index({ userId: 1, productId: 1, orderId: 1 }, { unique: true });
ReviewSchema.index({ productId: 1, moderationStatus: 1, createdAt: -1 });

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);
