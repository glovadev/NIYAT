import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(100).optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number")
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return apiError("UNAUTHENTICATED", "Please log in to view your profile", 401);
    }

    const { profile } = auth;
    return apiSuccess({
      id: String(profile._id),
      firebaseUid: profile.firebaseUid,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      wishlist: profile.wishlist || [],
      createdAt: profile.createdAt,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load profile";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return apiError("UNAUTHENTICATED", "Please log in to update your profile", 401);
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid input",
        400
      );
    }

    const { profile } = auth;
    const nameToUpdate = parsed.data.displayName || parsed.data.name;
    if (nameToUpdate) {
      profile.name = nameToUpdate.trim();
    }
    if (parsed.data.phone !== undefined) {
      profile.phone = parsed.data.phone.trim();
    }

    await profile.save();

    return apiSuccess({
      id: String(profile._id),
      firebaseUid: profile.firebaseUid,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      wishlist: profile.wishlist || [],
      updatedAt: profile.updatedAt,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update profile";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
