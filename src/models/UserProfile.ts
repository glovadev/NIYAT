import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserProfile extends Document {
  firebaseUid: string;
  name: string;
  email?: string;
  phone?: string;
  role: "CUSTOMER" | "STAFF" | "ADMIN" | "DISTRIBUTOR";
  status: "ACTIVE" | "DISABLED";
  companyName?: string;
  gstNumber?: string;
  passwordHash?: string;
  wishlist: mongoose.Types.ObjectId[];
  communicationPreferences: {
    marketingEmail: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfile>(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ["CUSTOMER", "STAFF", "ADMIN", "DISTRIBUTOR"],
      default: "CUSTOMER",
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "DISABLED"],
      default: "ACTIVE",
      index: true,
    },
    companyName: { type: String, trim: true },
    gstNumber: { type: String, trim: true, uppercase: true },
    passwordHash: { type: String },
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    communicationPreferences: {
      marketingEmail: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

UserProfileSchema.index({ role: 1, status: 1 });

export const UserProfile: Model<IUserProfile> =
  mongoose.models.UserProfile ||
  mongoose.model<IUserProfile>("UserProfile", UserProfileSchema);
