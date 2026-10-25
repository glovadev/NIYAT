import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInventoryMovement extends Document {
  productId: mongoose.Types.ObjectId;
  quantityChange: number; // e.g. +50 for restock, -1 for sale
  type: "RESTOCK" | "SALE" | "CANCELLATION" | "RETURN" | "ADJUSTMENT";
  reason: string;
  orderId?: mongoose.Types.ObjectId;
  actorType: "SYSTEM" | "ADMIN";
  actorId?: string;
  idempotencyKey: string;
  createdAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    quantityChange: { type: Number, required: true },
    type: {
      type: String,
      enum: ["RESTOCK", "SALE", "CANCELLATION", "RETURN", "ADJUSTMENT"],
      required: true,
      index: true,
    },
    reason: { type: String, required: true, trim: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    actorType: { type: String, enum: ["SYSTEM", "ADMIN"], required: true },
    actorId: { type: String },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

InventoryMovementSchema.index({ productId: 1, createdAt: -1 });

export const InventoryMovement: Model<IInventoryMovement> =
  mongoose.models.InventoryMovement ||
  mongoose.model<IInventoryMovement>("InventoryMovement", InventoryMovementSchema);
