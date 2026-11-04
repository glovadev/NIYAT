import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { requireDistributor } from "@/lib/auth/distributor-guard";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireDistributor(req);
    if (!authResult.authorized) return authResult.response!;

    await connectToDatabase();
    void Category;

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("q")?.trim();

    const query: Record<string, any> = {
      status: "PUBLISHED",
    };

    if (categoryId && categoryId !== "ALL") {
      query.categoryId = categoryId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const products = await Product.find(query)
      .populate("categoryId", "name slug")
      .sort({ stockQuantity: -1, createdAt: -1 })
      .lean();

    const items = products.map((p) => {
      const primaryImage = p.images?.find((img) => img.sortOrder === 0) || p.images?.[0];

      // If distributor price is explicitly set by admin, use it.
      // Otherwise fallback to 35% discount off regular price
      const effectiveDistributorPricePaise =
        typeof p.distributorPricePaise === "number" && p.distributorPricePaise > 0
          ? p.distributorPricePaise
          : Math.round(p.regularPricePaise * 0.65);

      const minBulkQuantity = p.distributorMinQuantity && p.distributorMinQuantity > 0
        ? p.distributorMinQuantity
        : 10;

      const discountPercent = Math.max(
        0,
        Math.round(((p.regularPricePaise - effectiveDistributorPricePaise) / p.regularPricePaise) * 100)
      );

      return {
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        sizeLabel: p.sizeLabel,
        shortDescription: p.shortDescription || "",
        categoryName: (p.categoryId as any)?.name || "General",
        categoryId: (p.categoryId as any)?._id ? String((p.categoryId as any)._id) : undefined,
        regularPricePaise: p.regularPricePaise,
        salePricePaise: p.salePricePaise,
        distributorPricePaise: effectiveDistributorPricePaise,
        distributorMinQuantity: minBulkQuantity,
        discountPercent,
        stockQuantity: p.stockQuantity,
        imageUrl: primaryImage?.url || "",
      };
    });

    return apiSuccess({
      products: items,
      totalCount: items.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load distributor catalog";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

