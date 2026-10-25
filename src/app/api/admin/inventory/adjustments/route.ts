import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { InventoryMovement } from "@/models/InventoryMovement";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const adjustmentSchema = z.object({
  productId: z.string().min(1),
  quantityChange: z.number().int().refine((val) => val !== 0, "quantityChange cannot be zero"),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(200),
});

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const body = await req.json();

    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid adjustment details",
        400
      );
    }

    const { productId, quantityChange, reason } = parsed.data;
    const product = await Product.findById(productId);

    if (!product) {
      return apiError("NOT_FOUND", "Product not found", 404);
    }

    const previousStock = product.stockQuantity;
    const newStock = Math.max(0, previousStock + quantityChange);
    product.stockQuantity = newStock;
    await product.save();

    const movementType = quantityChange > 0 ? "RESTOCK" : "ADJUSTMENT";
    const idempotencyKey = `adj_${productId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await InventoryMovement.create({
      productId: product._id,
      quantityChange,
      type: movementType,
      reason,
      actorType: "ADMIN",
      actorId: String(adminCheck.context?.profile._id),
      idempotencyKey,
    });

    return apiSuccess({
      productId: String(product._id),
      name: product.name,
      previousStock,
      stockQuantity: product.stockQuantity,
      quantityChange,
      message: `Stock updated successfully for ${product.name}`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to adjust inventory";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
