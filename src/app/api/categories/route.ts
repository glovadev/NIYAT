import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    const categories = await Category.find({ status: "ACTIVE" })
      .sort({ name: 1 })
      .lean();

    // Attach product counts to each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (c) => {
        const productCount = await Product.countDocuments({
          categoryId: c._id,
          status: "PUBLISHED",
        });

        return {
          id: String(c._id),
          name: c.name,
          slug: c.slug,
          description: c.description,
          image: c.image || null,
          productCount,
        };
      })
    );

    return apiSuccess({ items: categoriesWithCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch categories";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
