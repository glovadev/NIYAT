import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToDatabase();
    const { slug } = await params;

    const category = await Category.findOne({ slug, status: "ACTIVE" }).lean();

    if (!category) {
      return apiError("NOT_FOUND", "Category not found", 404);
    }

    const productCount = await Product.countDocuments({
      categoryId: category._id,
      status: "PUBLISHED",
    });

    return apiSuccess({
      id: String(category._id),
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      seo: category.seo,
      productCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch category details";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
