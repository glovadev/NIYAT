import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { Address } from "@/models/Address";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateAddressSchema = z.object({
  label: z.string().max(50).optional(),
  recipientName: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  addressLine1: z.string().min(5).max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  postalCode: z.string().regex(/^\d{6}$/).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ addressId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return apiError("UNAUTHENTICATED", "Please log in to update an address", 401);
    }

    const { addressId } = await params;
    const body = await req.json();
    const parsed = updateAddressSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid address data",
        400
      );
    }

    const address = await Address.findOne({
      _id: addressId,
      userId: auth.profile._id,
    });

    if (!address) {
      return apiError("NOT_FOUND", "Address not found", 404);
    }

    if (parsed.data.isDefault) {
      await Address.updateMany(
        { userId: auth.profile._id },
        { $set: { isDefault: false } }
      );
    }

    Object.assign(address, parsed.data);
    await address.save();

    return apiSuccess({
      id: String(address._id),
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update address";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ addressId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return apiError("UNAUTHENTICATED", "Please log in to delete an address", 401);
    }

    const { addressId } = await params;
    const deleted = await Address.findOneAndDelete({
      _id: addressId,
      userId: auth.profile._id,
    });

    if (!deleted) {
      return apiError("NOT_FOUND", "Address not found or already deleted", 404);
    }

    return apiSuccess({ message: "Address deleted successfully" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete address";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
