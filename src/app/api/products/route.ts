import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(24, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const q = searchParams.get("q")?.trim();
    const categorySlug = searchParams.get("category")?.trim();
    const sort = searchParams.get("sort") || "newest";
    const inStock = searchParams.get("inStock") === "true";
    const featured = searchParams.get("featured") === "true";

    // Base query: Only return PUBLISHED products publicly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { status: "PUBLISHED" };

    if (categorySlug) {
      const category = await Category.findOne({ slug: categorySlug, status: "ACTIVE" }).select("_id");
      if (category) {
        filter.categoryId = category._id;
      } else {
        // Unknown category returns empty results
        return apiSuccess({
          items: [],
          pagination: {
            page,
            limit,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }
    }

    if (inStock) {
      filter.stockQuantity = { $gt: 0 };
    }

    if (featured) {
      filter.isFeatured = true;
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { shortDescription: { $regex: q, $options: "i" } },
        { tags: { $in: [new RegExp(q, "i")] } },
      ];
    }

    // Sort mapping
    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === "price_asc") {
      sortOptions = { regularPricePaise: 1 };
    } else if (sort === "price_desc") {
      sortOptions = { regularPricePaise: -1 };
    } else if (sort === "popular") {
      sortOptions = { ratingAverage: -1, ratingCount: -1 };
    }

    const totalItems = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const rawProducts = await Product.find(filter)
      .populate("categoryId", "name slug")
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = rawProducts.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cat = p.categoryId as any;
      return {
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        sizeLabel: p.sizeLabel,
        shortDescription: p.shortDescription,
        regularPricePaise: p.regularPricePaise,
        salePricePaise: p.salePricePaise,
        currency: p.currency,
        images: p.images || [],
        primaryImage: p.images?.[0] || null,
        category: cat ? { id: String(cat._id), name: cat.name, slug: cat.slug } : null,
        inStock: p.stockQuantity > 0,
        stockStatus: p.stockQuantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
        ratingAverage: p.ratingAverage,
        ratingCount: p.ratingCount,
        isFeatured: p.isFeatured,
      };
    });

    return apiSuccess({
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch products";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
