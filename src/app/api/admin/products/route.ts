import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/models/Product";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createProductSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(140),
  sku: z.string().min(2).max(50),
  sizeLabel: z.string().min(1).max(30),
  categoryId: z.string().min(1),
  regularPricePaise: z.number().int().min(0),
  salePricePaise: z.number().int().min(0).nullable().optional(),
  shortDescription: z.string().max(300).optional(),
  description: z.string().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  images: z
    .array(
      z.object({
        url: z.string().min(1, "Image URL or path is required"),
        publicId: z.string().default("local_upload"),
        alt: z.string().default(""),
        sortOrder: z.number().default(0),
      })
    )
    .default([]),
  ingredients: z.array(z.string()).default([]),
  directions: z.string().optional(),
  warnings: z.string().optional(),
  verifiedBenefits: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) {
      return adminCheck.response!;
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const q = searchParams.get("q");
    const category = searchParams.get("category");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    if (status && status !== "ALL") {
      query.status = status;
    }
    if (category) {
      query.categoryId = category;
    }
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
      ];
    }

    const totalItems = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const products = await Product.find(query)
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return apiSuccess({
      items: products.map((p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cat = p.categoryId as any;
        return {
          id: String(p._id),
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          sizeLabel: p.sizeLabel,
          regularPricePaise: p.regularPricePaise,
          salePricePaise: p.salePricePaise,
          currency: p.currency,
          status: p.status,
          stockQuantity: p.stockQuantity,
          lowStockThreshold: p.lowStockThreshold,
          isFeatured: p.isFeatured,
          categoryId: cat?._id ? String(cat._id) : undefined,
          categoryName: cat?.name || "Uncategorized",
          shortDescription: p.shortDescription || "",
          imageUrl: p.images?.[0]?.url,
          ratingAverage: p.ratingAverage,
          ratingCount: p.ratingCount,
          createdAt: p.createdAt,
        };
      }),
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
    const msg = error instanceof Error ? error.message : "Failed to list admin products";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) {
      return adminCheck.response!;
    }

    await connectToDatabase();
    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid product details",
        400
      );
    }

    // Check slug or sku uniqueness
    const existing = await Product.findOne({
      $or: [{ slug: parsed.data.slug }, { sku: parsed.data.sku }],
    });

    if (existing) {
      return apiError(
        "CONFLICT",
        "A product with this slug or SKU already exists",
        409
      );
    }

    const product = await Product.create({
      ...parsed.data,
      currency: "INR",
    });

    return apiSuccess(
      {
        id: String(product._id),
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        status: product.status,
      },
      undefined,
      201
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create product";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
