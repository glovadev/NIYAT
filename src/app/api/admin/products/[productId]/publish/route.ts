import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { productId } = await params;
    const product = await Product.findById(productId);

    if (!product) {
      return apiError("NOT_FOUND", "Product not found", 404);
    }

    // Publication validation checks
    if (!product.regularPricePaise || product.regularPricePaise <= 0) {
      return apiError("VALIDATION_ERROR", "Product must have a regular price before publishing", 422);
    }
    if (!product.images || product.images.length === 0) {
      return apiError("VALIDATION_ERROR", "Product must have at least one image before publishing", 422);
    }

    product.status = "PUBLISHED";
    await product.save();

    return apiSuccess({
      id: String(product._id),
      name: product.name,
      status: product.status,
      message: "Product successfully published to storefront catalog",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to publish product";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
