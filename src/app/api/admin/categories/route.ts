import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(60),
  slug: z.string().min(2).max(60).optional(),
  description: z.string().max(250).optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  sortOrder: z.number().int().default(0),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();

    const categories = await Category.find({})
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    // Attach product count to each category
    const items = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({
          categoryId: cat._id,
          status: { $ne: "ARCHIVED" },
        });

        return {
          id: String(cat._id),
          name: cat.name,
          slug: cat.slug,
          description: cat.description || "",
          image: cat.image,
          sortOrder: cat.sortOrder ?? 0,
          status: cat.status,
          productCount,
          createdAt: cat.createdAt,
        };
      })
    );

    return apiSuccess({ items });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load categories";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const body = await req.json();

    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid category details",
        400
      );
    }

    const { name, description, imageUrl, imageAlt, sortOrder, status } = parsed.data;

    // Generate or clean slug
    let slug = parsed.data.slug?.trim().toLowerCase() || name.trim().toLowerCase();
    slug = slug
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check if slug is unique
    const existing = await Category.findOne({ slug });
    if (existing) {
      return apiError("DUPLICATE_SLUG", `A category with slug "${slug}" already exists`, 409);
    }

    const category = await Category.create({
      name: name.trim(),
      slug,
      description: description?.trim() || undefined,
      image: imageUrl
        ? {
            url: imageUrl,
            publicId: `cat_${Date.now()}`,
            alt: imageAlt?.trim() || name.trim(),
          }
        : undefined,
      sortOrder,
      status,
    });

    return apiSuccess(
      {
        id: String(category._id),
        name: category.name,
        slug: category.slug,
        status: category.status,
      },
      undefined,
      201
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create category";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
