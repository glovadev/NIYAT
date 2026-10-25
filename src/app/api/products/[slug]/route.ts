import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { Review } from "@/models/Review";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToDatabase();
    const { slug } = await params;

    if (!slug) {
      return apiError("VALIDATION_ERROR", "Product slug is required", 400);
    }

    const product = await Product.findOne({ slug, status: "PUBLISHED" })
      .populate("categoryId", "name slug description")
      .lean();

    if (!product) {
      return apiError("PRODUCT_NOT_FOUND", "Product not found or currently unavailable", 404);
    }

    // Fetch approved customer reviews
    const reviews = await Review.find({
      productId: product._id,
      moderationStatus: "APPROVED",
    })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cat = product.categoryId as any;

    const data = {
      id: String(product._id),
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      barcode: product.barcode,
      sizeLabel: product.sizeLabel,
      shortDescription: product.shortDescription,
      description: product.description,
      regularPricePaise: product.regularPricePaise,
      salePricePaise: product.salePricePaise,
      currency: product.currency,
      images: product.images || [],
      ingredients: product.ingredients || [],
      directions: product.directions || "",
      warnings: product.warnings || "",
      verifiedBenefits: product.verifiedBenefits || [],
      specifications: product.specifications || {},
      category: cat ? { id: String(cat._id), name: cat.name, slug: cat.slug, description: cat.description } : null,
      inStock: product.stockQuantity > 0,
      stockQuantity: product.stockQuantity, // safe preview
      lowStock: product.stockQuantity <= product.lowStockThreshold,
      ratingAverage: product.ratingAverage,
      ratingCount: product.ratingCount,
      seo: product.seo || {},
      reviews: reviews.map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = r.userId as any;
        return {
          id: String(r._id),
          authorName: user?.name ? `${user.name.split(" ")[0]}...` : "Verified Buyer",
          rating: r.rating,
          title: r.title,
          body: r.body,
          verificationStatus: r.verificationStatus,
          createdAt: r.createdAt,
        };
      }),
    };

    return apiSuccess(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch product details";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
