import { NextRequest } from "next/server";
import { requireDistributor } from "@/lib/auth/distributor-guard";
import { apiSuccess } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authResult = await requireDistributor(req);
  if (!authResult.authorized) return authResult.response!;

  const { profile } = authResult.context!;

  return apiSuccess({
    distributor: {
      id: String(profile._id),
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      companyName: profile.companyName || profile.name,
      gstNumber: profile.gstNumber || "",
      role: profile.role,
      status: profile.status,
    },
  });
}

