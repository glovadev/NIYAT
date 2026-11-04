import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { UserProfile } from "@/models/UserProfile";
import { Order } from "@/models/Order";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { apiSuccess, apiError } from "@/lib/api/response";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createDistributorSchema = z.object({
  name: z.string().min(2, "Contact person name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyName: z.string().min(2, "Company or business name is required").max(150),
  gstNumber: z.string().max(20).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
});

export async function GET(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin(req, "STAFF");
    if (!adminAuth.authorized) return adminAuth.response!;

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.trim();
    const status = searchParams.get("status");

    const query: Record<string, any> = { role: "DISTRIBUTOR" };
    if (status && status !== "ALL") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { gstNumber: { $regex: search, $options: "i" } },
      ];
    }

    const distributors = await UserProfile.find(query).sort({ createdAt: -1 }).lean();

    // Fetch order aggregation for each distributor
    const distributorIds = distributors.map((d) => d._id);
    const orderStats = await Order.aggregate([
      {
        $match: {
          userId: { $in: distributorIds },
        },
      },
      {
        $group: {
          _id: "$userId",
          totalOrders: { $sum: 1 },
          totalSpentPaise: { $sum: "$totalPaise" },
          lastOrderAt: { $max: "$createdAt" },
        },
      },
    ]);

    const statsMap = new Map(
      orderStats.map((s) => [String(s._id), s])
    );

    const items = distributors.map((d) => {
      const stats = statsMap.get(String(d._id));
      return {
        id: String(d._id),
        name: d.name,
        email: d.email,
        phone: d.phone,
        companyName: d.companyName || "N/A",
        gstNumber: d.gstNumber || "",
        status: d.status,
        role: d.role,
        createdAt: d.createdAt,
        totalOrders: stats ? stats.totalOrders : 0,
        totalSpentPaise: stats ? stats.totalSpentPaise : 0,
        lastOrderAt: stats ? stats.lastOrderAt : null,
      };
    });

    return apiSuccess({
      distributors: items,
      totalCount: items.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load distributors";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin(req, "ADMIN");
    if (!adminAuth.authorized) return adminAuth.response!;

    const body = await req.json();
    const parsed = createDistributorSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid distributor data",
        400
      );
    }

    const { name, email, phone, password, companyName, gstNumber, status } = parsed.data;

    await connectToDatabase();

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await UserProfile.findOne({ email: normalizedEmail });
    if (existing) {
      return apiError(
        "EMAIL_EXISTS",
        `An account with email '${normalizedEmail}' already exists (Role: ${existing.role}).`,
        409
      );
    }

    const hashedPassword = hashPassword(password);
    const uniqueUid = `dist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newDistributor = await UserProfile.create({
      firebaseUid: uniqueUid,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      role: "DISTRIBUTOR",
      status: status || "ACTIVE",
      companyName: companyName.trim(),
      gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : undefined,
      passwordHash: hashedPassword,
      communicationPreferences: { marketingEmail: false },
    });

    return apiSuccess(
      {
        distributor: {
          id: String(newDistributor._id),
          name: newDistributor.name,
          email: newDistributor.email,
          phone: newDistributor.phone,
          companyName: newDistributor.companyName,
          gstNumber: newDistributor.gstNumber,
          status: newDistributor.status,
          role: newDistributor.role,
          createdAt: newDistributor.createdAt,
        },
        message: "Distributor created successfully",
      },
      undefined,
      201
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create distributor";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

