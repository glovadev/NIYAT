import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAddress extends Document {
  userId: mongoose.Types.ObjectId;
  label?: string; // e.g. "Home", "Office"
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: "IN";
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true, index: true },
    label: { type: String, default: "Home", trim: true },
    recipientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, default: "IN", enum: ["IN"] },
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

AddressSchema.index({ userId: 1, isDefault: 1 });

export const Address: Model<IAddress> =
  mongoose.models.Address || mongoose.model<IAddress>("Address", AddressSchema);
