import mongoose, { Schema, Document, Model } from "mongoose";

export type NoticeTheme = "EMERALD" | "GOLD" | "DARK" | "AMBER";
export type NoticeIcon = "SPARKLES" | "BELL" | "ALERT" | "TRUCK" | "GIFT" | "INFO";

export interface INotice extends Document {
  title: string;
  message: string;
  badge: string;
  linkUrl?: string;
  linkText?: string;
  theme: NoticeTheme;
  icon: NoticeIcon;
  isActive: boolean;
  showOnTopBar: boolean;
  startsAt?: Date;
  endsAt?: Date;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    badge: { type: String, default: "Notice & Update", trim: true, maxlength: 60 },
    linkUrl: { type: String, default: "", trim: true, maxlength: 500 },
    linkText: { type: String, default: "", trim: true, maxlength: 60 },
    theme: {
      type: String,
      enum: ["EMERALD", "GOLD", "DARK", "AMBER"],
      default: "EMERALD",
    },
    icon: {
      type: String,
      enum: ["SPARKLES", "BELL", "ALERT", "TRUCK", "GIFT", "INFO"],
      default: "SPARKLES",
    },
    isActive: { type: Boolean, default: false, index: true },
    showOnTopBar: { type: Boolean, default: false },
    startsAt: { type: Date },
    endsAt: { type: Date },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

NoticeSchema.index({ isActive: 1, sortOrder: 1, updatedAt: -1 });

export const Notice: Model<INotice> =
  mongoose.models.Notice || mongoose.model<INotice>("Notice", NoticeSchema);
