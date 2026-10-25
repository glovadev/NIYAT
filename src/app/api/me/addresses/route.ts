import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { Address } from "@/models/Address";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const addressSchema = z.object({
  label: z.string().max(50).default("Home"),
  recipientName: z.string().min(2, "Recipient name must be at least 2 characters").max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number"),
  addressLine1: z.string().min(5, "Address line 1 must be at least 5 characters").max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  postalCode: z.string().regex(/^\d{6}$/, "Must be a valid 6-digit Indian PIN code"),
  isDefault: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return apiError("UNAUTHENTICATED", "Please log in to view addresses", 401);
    }

    const addresses = await Address.find({ userId: auth.profile._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return apiSuccess({
      items: addresses.map((a) => ({
        id: String(a._id),
        label: a.label,
        recipientName: a.recipientName,
        phone: a.phone,
        addressLine1: a.addressLine1,
        addressLine2: a.addressLine2,
        city: a.city,
        state: a.state,
        postalCode: a.postalCode,
        country: a.country,
        isDefault: a.isDefault,
        createdAt: a.createdAt,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load addresses";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return apiError("UNAUTHENTICATED", "Please log in to add an address", 401);
    }

    const body = await req.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid address data",
        400
      );
    }

    // If this address is set as default, or if it's the customer's first address, set isDefault
    const count = await Address.countDocuments({ userId: auth.profile._id });
    const isFirstAddress = count === 0;
    const shouldBeDefault = parsed.data.isDefault || isFirstAddress;

    if (shouldBeDefault) {
      await Address.updateMany(
        { userId: auth.profile._id },
        { $set: { isDefault: false } }
      );
    }

    const address = await Address.create({
      userId: auth.profile._id,
      ...parsed.data,
      country: "IN",
      isDefault: shouldBeDefault,
    });

    return apiSuccess(
      {
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
      },
      undefined,
      201
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create address";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
