import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export interface ProductSuggestionItem {
  id: string;
  name: string;
  slug: string;
  sizeLabel?: string;
  regularPricePaise: number;
  salePricePaise?: number | null;
  inStock: boolean;
  imageUrl: string;
  categoryName?: string | null;
  categorySlug?: string | null;
}

export interface CategorySuggestionItem {
  id: string;
  name: string;
  slug: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 1) {
      return apiSuccess({
        query: "",
        products: [],
        categories: [],
      });
    }

    await connectToDatabase();

    // Escape special regex characters to prevent regex injection or syntax errors
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    // 1. Find matching categories
    const matchingCategories = await Category.find({
      status: "ACTIVE",
      name: { $regex: regex },
    })
      .select("_id name slug")
      .limit(4)
      .lean();

    const categoryIds = matchingCategories.map((c) => c._id);

    // 2. Find matching products:
    // Matches product name, slug, tags, OR product category matching the query
    const rawProducts = await Product.find({
      status: "PUBLISHED",
      $or: [
        { name: { $regex: regex } },
        { slug: { $regex: regex } },
        { tags: { $in: [regex] } },
        ...(categoryIds.length > 0 ? [{ categoryId: { $in: categoryIds } }] : []),
      ],
    })
      .populate("categoryId", "name slug")
      .select("_id name slug sizeLabel regularPricePaise salePricePaise images stockQuantity categoryId")
      .sort({ isFeatured: -1, stockQuantity: -1, createdAt: -1 })
      .limit(8)
      .lean();

    const products: ProductSuggestionItem[] = rawProducts.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cat = p.categoryId as any;
      const primaryImg = p.images?.[0]?.url || "/logo.svg";

      return {
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        sizeLabel: p.sizeLabel,
        regularPricePaise: p.regularPricePaise,
        salePricePaise: p.salePricePaise ?? null,
        inStock: p.stockQuantity > 0,
        imageUrl: primaryImg,
        categoryName: cat?.name || null,
        categorySlug: cat?.slug || null,
      };
    });

    const categories: CategorySuggestionItem[] = matchingCategories.map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
    }));

    return apiSuccess({
      query: q,
      products,
      categories,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load product suggestions";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

