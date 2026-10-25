import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICategoryImage {
  url: string;
  publicId: string;
  alt: string;
}

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: ICategoryImage;
  sortOrder?: number;
  status: "ACTIVE" | "ARCHIVED";
  seo?: {
    title?: string;
    description?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    image: {
      url: { type: String },
      publicId: { type: String },
      alt: { type: String, default: "" },
    },
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
  }
);

CategorySchema.index({ status: 1, name: 1 });

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);
