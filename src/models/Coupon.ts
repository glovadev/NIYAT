import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  type: "FIXED" | "PERCENTAGE";
  value: number; // percentage (e.g. 10 for 10%) or fixed discount amount in paise
  minimumOrderPaise: number;
  maximumDiscountPaise?: number; // Capping for percentage discounts
  startsAt: Date;
  expiresAt: Date;
  usageLimit?: number;
  perCustomerLimit?: number;
  applicableProductIds?: mongoose.Types.ObjectId[];
  applicableCategoryIds?: mongoose.Types.ObjectId[];
  usedCount: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    type: { type: String, enum: ["FIXED", "PERCENTAGE"], required: true },
    value: { type: Number, required: true, min: 1 },
    minimumOrderPaise: { type: Number, default: 0, min: 0 },
    maximumDiscountPaise: { type: Number, min: 0 },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    usageLimit: { type: Number, min: 1 },
    perCustomerLimit: { type: Number, default: 1, min: 1 },
    applicableProductIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    applicableCategoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    usedCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE", index: true },
  },
  {
    timestamps: true,
  }
);

CouponSchema.index({ status: 1, startsAt: 1, expiresAt: 1 });

export const Coupon: Model<ICoupon> =
  mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", CouponSchema);
