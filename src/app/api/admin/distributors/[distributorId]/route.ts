import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { UserProfile } from "@/models/UserProfile";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { apiSuccess, apiError } from "@/lib/api/response";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateDistributorSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  companyName: z.string().min(2).max(150).optional(),
  gstNumber: z.string().max(20).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  password: z.string().min(6, "New password must be at least 6 characters").optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ distributorId: string }> }
) {
  try {
    const adminAuth = await requireAdmin(req, "STAFF");
    if (!adminAuth.authorized) return adminAuth.response!;

    const { distributorId } = await params;
    await connectToDatabase();

    const distributor = await UserProfile.findOne({
      _id: distributorId,
      role: "DISTRIBUTOR",
    }).lean();

    if (!distributor) {
      return apiError("NOT_FOUND", "Distributor not found", 404);
    }

    return apiSuccess({
      distributor: {
        id: String(distributor._id),
        name: distributor.name,
        email: distributor.email,
        phone: distributor.phone,
        companyName: distributor.companyName || "",
        gstNumber: distributor.gstNumber || "",
        status: distributor.status,
        role: distributor.role,
        createdAt: distributor.createdAt,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to get distributor";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ distributorId: string }> }
) {
  try {
    const adminAuth = await requireAdmin(req, "ADMIN");
    if (!adminAuth.authorized) return adminAuth.response!;

    const { distributorId } = await params;
    const body = await req.json();
    const parsed = updateDistributorSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid input data",
        400
      );
    }

    await connectToDatabase();

    const distributor = await UserProfile.findOne({
      _id: distributorId,
      role: "DISTRIBUTOR",
    });

    if (!distributor) {
      return apiError("NOT_FOUND", "Distributor not found", 404);
    }

    const { name, phone, companyName, gstNumber, status, password } = parsed.data;

    if (name) distributor.name = name.trim();
    if (phone) distributor.phone = phone.trim();
    if (companyName) distributor.companyName = companyName.trim();
    if (gstNumber !== undefined) distributor.gstNumber = gstNumber.trim().toUpperCase();
    if (status) distributor.status = status;
    if (password) {
      distributor.passwordHash = hashPassword(password);
    }

    await distributor.save();

    return apiSuccess({
      distributor: {
        id: String(distributor._id),
        name: distributor.name,
        email: distributor.email,
        phone: distributor.phone,
        companyName: distributor.companyName,
        gstNumber: distributor.gstNumber,
        status: distributor.status,
        role: distributor.role,
        updatedAt: distributor.updatedAt,
      },
      message: "Distributor updated successfully",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update distributor";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ distributorId: string }> }
) {
  try {
    const adminAuth = await requireAdmin(req, "ADMIN");
    if (!adminAuth.authorized) return adminAuth.response!;

    const { distributorId } = await params;
    await connectToDatabase();

    const distributor = await UserProfile.findOne({
      _id: distributorId,
      role: "DISTRIBUTOR",
    });

    if (!distributor) {
      return apiError("NOT_FOUND", "Distributor not found", 404);
    }

    // Set to DISABLED instead of hard deleting to preserve order history
    distributor.status = "DISABLED";
    await distributor.save();

    return apiSuccess({
      message: "Distributor account has been disabled.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to disable distributor";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

