import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, AuthenticatedContext } from "@/lib/auth/server";
import { apiError } from "@/lib/api/response";

export interface DistributorAuthResult {
  authorized: boolean;
  context?: AuthenticatedContext;
  response?: NextResponse;
}

/**
 * Ensures the incoming request is made by an active DISTRIBUTOR (or ADMIN) user.
 */
export async function requireDistributor(
  req: NextRequest
): Promise<DistributorAuthResult> {
  const auth = await getAuthenticatedUser(req);

  if (!auth) {
    return {
      authorized: false,
      response: apiError(
        "UNAUTHENTICATED",
        "Distributor portal access requires signing in.",
        401
      ),
    };
  }

  const { profile } = auth;

  if (profile.status === "DISABLED") {
    return {
      authorized: false,
      response: apiError(
        "ACCOUNT_DISABLED",
        "Your distributor account is currently suspended. Please contact NIYAT administration.",
        403
      ),
    };
  }

  // Admins are allowed to test distributor features as well
  if (profile.role !== "DISTRIBUTOR" && profile.role !== "ADMIN") {
    return {
      authorized: false,
      response: apiError(
        "FORBIDDEN",
        "Access denied. This portal is restricted to authorized NIYAT distributors.",
        403
      ),
    };
  }

  return {
    authorized: true,
    context: auth,
  };
}

