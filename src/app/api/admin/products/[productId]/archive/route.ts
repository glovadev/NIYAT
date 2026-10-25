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
    const product = await Product.findByIdAndUpdate(
      productId,
      { status: "ARCHIVED" },
      { new: true }
    );

    if (!product) {
      return apiError("NOT_FOUND", "Product not found", 404);
    }

    return apiSuccess({
      id: String(product._id),
      name: product.name,
      status: product.status,
      message: "Product archived and removed from storefront catalog",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to archive product";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
