import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateCategorySchema = z.object({
  name: z.string().min(2).max(60).optional(),
  slug: z.string().min(2).max(60).optional(),
  description: z.string().max(250).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  imageAlt: z.string().optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { categoryId } = await params;
    const body = await req.json();

    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid category update payload",
        400
      );
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return apiError("NOT_FOUND", "Category not found", 404);
    }

    const { name, slug, description, imageUrl, imageAlt, sortOrder, status } = parsed.data;

    if (name) category.name = name.trim();
    if (slug) {
      const cleanSlug = slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (cleanSlug !== category.slug) {
        const duplicate = await Category.findOne({ slug: cleanSlug, _id: { $ne: category._id } });
        if (duplicate) {
          return apiError("DUPLICATE_SLUG", `Slug "${cleanSlug}" is already in use`, 409);
        }
        category.slug = cleanSlug;
      }
    }

    if (description !== undefined) {
      category.description = description ? description.trim() : undefined;
    }

    if (imageUrl !== undefined) {
      if (imageUrl) {
        category.image = {
          url: imageUrl,
          publicId: category.image?.publicId || `cat_${Date.now()}`,
          alt: imageAlt?.trim() || category.name,
        };
      } else {
        category.image = undefined;
      }
    }

    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (status) category.status = status;

    await category.save();

    return apiSuccess({
      message: "Category updated successfully",
      category: {
        id: String(category._id),
        name: category.name,
        slug: category.slug,
        status: category.status,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update category";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "ADMIN");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { categoryId } = await params;

    const category = await Category.findById(categoryId);
    if (!category) {
      return apiError("NOT_FOUND", "Category not found", 404);
    }

    // Check if products are currently using this category
    const productCount = await Product.countDocuments({ categoryId: category._id });
    if (productCount > 0) {
      // Archive instead of hard delete to avoid breaking products
      category.status = "ARCHIVED";
      await category.save();
      return apiSuccess({
        message: `Category has ${productCount} products assigned and was archived rather than deleted.`,
        archived: true,
      });
    }

    await Category.findByIdAndDelete(categoryId);
    return apiSuccess({ message: "Category deleted successfully" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete category";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
