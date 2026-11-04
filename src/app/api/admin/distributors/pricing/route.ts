import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const priceItemSchema = z.object({
  productId: z.string().min(1),
  distributorPricePaise: z.number().int().min(0).nullable(),
  distributorMinQuantity: z.number().int().min(1).default(10),
});

const bulkPricingSchema = z.object({
  updates: z.array(priceItemSchema),
});

export async function GET(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin(req, "STAFF");
    if (!adminAuth.authorized) return adminAuth.response!;

    await connectToDatabase();
    // Ensure Category model is registered
    void Category;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.trim();
    const categoryId = searchParams.get("categoryId");

    const query: Record<string, any> = { status: { $ne: "ARCHIVED" } };
    if (categoryId && categoryId !== "ALL") {
      query.categoryId = categoryId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(query)
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean();

    const items = products.map((p) => {
      const primaryImage = p.images?.find((img) => img.sortOrder === 0) || p.images?.[0];
      return {
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        sizeLabel: p.sizeLabel,
        categoryName: (p.categoryId as any)?.name || "Uncategorized",
        regularPricePaise: p.regularPricePaise,
        salePricePaise: p.salePricePaise,
        distributorPricePaise: p.distributorPricePaise ?? null,
        distributorMinQuantity: p.distributorMinQuantity ?? 10,
        stockQuantity: p.stockQuantity,
        status: p.status,
        imageUrl: primaryImage?.url || "",
      };
    });

    return apiSuccess({
      products: items,
      totalCount: items.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load distributor pricing";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin(req, "ADMIN");
    if (!adminAuth.authorized) return adminAuth.response!;

    const body = await req.json();

    // Support both single update { productId, distributorPricePaise, distributorMinQuantity }
    // and batch update { updates: [...] }
    let updatesList = [];
    if (Array.isArray(body?.updates)) {
      const parsed = bulkPricingSchema.safeParse(body);
      if (!parsed.success) {
        return apiError(
          "VALIDATION_ERROR",
          parsed.error.errors[0]?.message || "Invalid pricing data",
          400
        );
      }
      updatesList = parsed.data.updates;
    } else {
      const parsed = priceItemSchema.safeParse(body);
      if (!parsed.success) {
        return apiError(
          "VALIDATION_ERROR",
          parsed.error.errors[0]?.message || "Invalid pricing data",
          400
        );
      }
      updatesList = [parsed.data];
    }

    await connectToDatabase();

    const bulkOps = updatesList.map((item) => ({
      updateOne: {
        filter: { _id: item.productId },
        update: {
          $set: {
            distributorPricePaise: item.distributorPricePaise,
            distributorMinQuantity: item.distributorMinQuantity,
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }

    return apiSuccess({
      updatedCount: bulkOps.length,
      message: `Successfully updated distributor pricing for ${bulkOps.length} product(s).`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update distributor pricing";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

