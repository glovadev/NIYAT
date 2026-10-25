import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return apiError("UNAUTHENTICATED", "Please log in to manage your wishlist", 401);
    }

    const { productId } = await params;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return apiError("VALIDATION_ERROR", "A valid productId is required", 400);
    }

    const { profile } = auth;
    if (profile.wishlist) {
      profile.wishlist = profile.wishlist.filter(
        (id) => String(id) !== productId
      );
      await profile.save();
    }

    return apiSuccess({
      message: "Product removed from wishlist",
      wishlistCount: profile.wishlist?.length || 0,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to remove from wishlist";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
