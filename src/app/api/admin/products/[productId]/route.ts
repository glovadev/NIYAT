import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { productId } = await params;
    const product = await Product.findById(productId).populate("categoryId").lean();

    if (!product) {
      return apiError("NOT_FOUND", "Product not found", 404);
    }

    return apiSuccess(product);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load product";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { productId } = await params;
    const body = await req.json();

    const product = await Product.findById(productId);
    if (!product) {
      return apiError("NOT_FOUND", "Product not found", 404);
    }

    // Assign editable fields
    const allowed = [
      "name",
      "slug",
      "sku",
      "barcode",
      "shortDescription",
      "description",
      "categoryId",
      "sizeLabel",
      "regularPricePaise",
      "salePricePaise",
      "images",
      "ingredients",
      "directions",
      "warnings",
      "verifiedBenefits",
      "stockQuantity",
      "lowStockThreshold",
      "status",
      "isFeatured",
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (product as any)[key] = body[key];
      }
    }

    await product.save();
    return apiSuccess({ message: "Product updated successfully", product });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update product";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "ADMIN");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { productId } = await params;
    const product = await Product.findById(productId);
    if (!product) {
      return apiError("NOT_FOUND", "Product not found", 404);
    }

    // Check if orders reference this product
    const { Order } = await import("@/models/Order");
    const orderCount = await Order.countDocuments({ "items.productId": product._id });

    const hardParam = req.nextUrl.searchParams.get("hard");
    const forceHard = hardParam === "true";

    if (orderCount > 0 && !forceHard) {
      product.status = "ARCHIVED";
      await product.save();
      return apiSuccess({
        message: `Product has ${orderCount} existing order(s) and was archived from the storefront.`,
        archived: true,
      });
    }

    await Product.findByIdAndDelete(productId);
    return apiSuccess({
      message: "Product permanently deleted successfully",
      deleted: true,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete product";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
