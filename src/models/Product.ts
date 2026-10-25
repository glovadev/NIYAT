import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProductImage {
  url: string;
  publicId: string;
  alt: string;
  sortOrder: number;
}

export interface IProductSEO {
  title?: string;
  description?: string;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  sku: string;
  barcode?: string;
  shortDescription?: string;
  description?: string;
  categoryId: mongoose.Types.ObjectId;
  sizeLabel: string; // e.g. "40 g", "100 g", "3 ml"
  regularPricePaise: number;
  salePricePaise?: number | null;
  currency: "INR";
  images: IProductImage[];
  ingredients?: string[];
  directions?: string;
  warnings?: string;
  verifiedBenefits?: string[];
  specifications?: Map<string, string>;
  stockQuantity: number;
  lowStockThreshold: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  tags: string[];
  ratingAverage: number;
  ratingCount: number;
  seo: IProductSEO;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    barcode: { type: String, trim: true },
    shortDescription: { type: String, trim: true },
    description: { type: String, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    sizeLabel: { type: String, required: true, trim: true },
    regularPricePaise: { type: Number, required: true, min: 0 },
    salePricePaise: {
      type: Number,
      default: null,
      validate: {
        validator: function (this: IProduct, val: number | null) {
          if (val === null || val === undefined) return true;
          return val >= 0 && val < this.regularPricePaise;
        },
        message: "Sale price must be non-negative and less than regular price.",
      },
    },
    currency: { type: String, default: "INR", enum: ["INR"] },
    images: { type: [ProductImageSchema], default: [] },
    ingredients: { type: [String], default: [] },
    directions: { type: String, trim: true },
    warnings: { type: String, trim: true },
    verifiedBenefits: { type: [String], default: [] },
    specifications: { type: Map, of: String, default: {} },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    tags: { type: [String], default: [], index: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for catalog search, filtering and sorting
ProductSchema.index({ status: 1, categoryId: 1 });
ProductSchema.index({ status: 1, isFeatured: 1 });
ProductSchema.index({ status: 1, regularPricePaise: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
