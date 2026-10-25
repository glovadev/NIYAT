import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { Product } from "@/models/Product";
import { apiSuccess, apiError } from "@/lib/api/response";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return apiError("UNAUTHENTICATED", "Please log in to view your wishlist", 401);
    }

    const { profile } = auth;
    const wishlistIds = profile.wishlist || [];

    const products = await Product.find({
      _id: { $in: wishlistIds },
      status: "PUBLISHED",
    }).lean();

    return apiSuccess({
      items: products.map((p) => ({
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        sizeLabel: p.sizeLabel,
        regularPricePaise: p.regularPricePaise,
        salePricePaise: p.salePricePaise,
        imageUrl: p.images?.[0]?.url,
        inStock: p.stockQuantity > 0,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load wishlist";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return apiError("UNAUTHENTICATED", "Please log in to add items to your wishlist", 401);
    }

    const body = await req.json();
    const productId = body?.productId;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return apiError("VALIDATION_ERROR", "A valid productId is required", 400);
    }

    const product = await Product.findOne({
      _id: productId,
      status: "PUBLISHED",
    });

    if (!product) {
      return apiError("NOT_FOUND", "Product not found or unavailable", 404);
    }

    const { profile } = auth;
    const pObjectId = new mongoose.Types.ObjectId(productId);

    if (!profile.wishlist) {
      profile.wishlist = [];
    }

    const alreadyInWishlist = profile.wishlist.some(
      (id) => String(id) === String(pObjectId)
    );

    if (!alreadyInWishlist) {
      profile.wishlist.push(pObjectId);
      await profile.save();
    }

    return apiSuccess({
      message: "Product added to wishlist",
      wishlistCount: profile.wishlist.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update wishlist";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
