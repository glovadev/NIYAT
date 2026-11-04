import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBanner extends Document {
  title?: string;
  subtitle?: string;
  image: {
    url: string;
    publicId: string;
    alt: string;
  };
  placement: "HOME_HERO" | "HOME_PROMO" | "CATEGORY";
  targetUrl: string;
  startsAt?: Date;
  endsAt?: Date;
  sortOrder: number;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    title: { type: String, default: "", trim: true },
    subtitle: { type: String, default: "", trim: true },
    image: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      alt: { type: String, default: "" },
    },
    placement: {
      type: String,
      enum: ["HOME_HERO", "HOME_PROMO", "CATEGORY"],
      default: "HOME_HERO",
      index: true,
    },
    targetUrl: { type: String, default: "/shop", trim: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["ACTIVE", "DRAFT", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

BannerSchema.index({ status: 1, placement: 1, sortOrder: 1 });

export const Banner: Model<IBanner> =
  mongoose.models.Banner || mongoose.model<IBanner>("Banner", BannerSchema);
