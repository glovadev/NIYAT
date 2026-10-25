import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const lowStockOnly = searchParams.get("lowStock") === "true";
    const q = searchParams.get("q");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    if (lowStockOnly) {
      query.$expr = { $lte: ["$stockQuantity", "$lowStockThreshold"] };
    }
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
      ];
    }

    const products = await Product.find(query)
      .populate("categoryId", "name")
      .sort({ stockQuantity: 1 })
      .lean();

    return apiSuccess({
      items: products.map((p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cat = p.categoryId as any;
        return {
          productId: String(p._id),
          name: p.name,
          sku: p.sku,
          sizeLabel: p.sizeLabel,
          categoryName: cat?.name || "Uncategorized",
          stockQuantity: p.stockQuantity,
          lowStockThreshold: p.lowStockThreshold,
          isLowStock: p.stockQuantity <= p.lowStockThreshold,
          status: p.status,
          imageUrl: p.images?.[0]?.url,
        };
      }),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load inventory";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
