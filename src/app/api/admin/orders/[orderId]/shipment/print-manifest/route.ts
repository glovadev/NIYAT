import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { printManifest } from "@/lib/shiprocket";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminCheck = await requireAdmin(req, "STAFF");
    if (!adminCheck.authorized) return adminCheck.response!;

    await connectToDatabase();
    const { orderId } = await params;

    const result = await printManifest(orderId);

    return apiSuccess({
      manifestUrl: result.manifestUrl,
      message: "Printable manifest retrieved successfully",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to retrieve printable manifest";
    return apiError("MANIFEST_PRINT_FAILED", msg, 400);
  }
}

