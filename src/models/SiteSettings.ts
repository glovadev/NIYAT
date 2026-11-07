import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISiteSettings extends Document {
  key: "default";
  brandName: string;
  currency: "INR";
  freeShippingThresholdPaise: number;
  standardShippingFeePaise: number;
  isFreeDeliveryOfferActive: boolean;
  freeDeliveryBannerText?: string;
  codEnabled: boolean;
  codMinOrderPaise: number;
  codMaxOrderPaise: number;
  reservationTtlMinutes: number;
  lowStockThresholdDefault: number;
  taxRatePercent: number;
  announcementBar: {
    enabled: boolean;
    text: string;
    link?: string;
  };
  contactEmail: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: { type: String, default: "default", unique: true },
    brandName: { type: String, default: "NIYAT" },
    currency: { type: String, default: "INR", enum: ["INR"] },
    freeShippingThresholdPaise: { type: Number, default: 99900 }, // Free above ₹999
    standardShippingFeePaise: { type: Number, default: 9900 }, // ₹99 standard shipping
    isFreeDeliveryOfferActive: { type: Boolean, default: false }, // Store-wide free delivery promotion
    freeDeliveryBannerText: {
      type: String,
      default: "Limited Time: Complimentary Free Delivery on All Orders!",
    },
    codEnabled: { type: Boolean, default: true },
    codMinOrderPaise: { type: Number, default: 30000 }, // ₹300 min for COD
    codMaxOrderPaise: { type: Number, default: 300000 }, // ₹3,000 max for COD
    reservationTtlMinutes: { type: Number, default: 30 },
    lowStockThresholdDefault: { type: Number, default: 5 },
    taxRatePercent: { type: Number, default: 18 }, // Standard GST rate in India
    announcementBar: {
      enabled: { type: Boolean, default: true },
      text: { type: String, default: "Complimentary shipping on orders above ₹999 | Discover Pure Radiance" },
      link: { type: String, default: "/shop" },
    },
    contactEmail: { type: String, default: "care@niyat.in" },
    contactPhone: { type: String, default: "+91 98765 43210" },
  },
  {
    timestamps: true,
  }
);

export const SiteSettings: Model<ISiteSettings> =
  mongoose.models.SiteSettings ||
  mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);
