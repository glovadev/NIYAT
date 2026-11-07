import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, AuthenticatedContext } from "@/lib/auth/server";
import { apiError } from "@/lib/api/response";

export interface AdminAuthResult {
  authorized: boolean;
  context?: AuthenticatedContext;
  response?: NextResponse;
}

/**
 * Ensures the incoming request is made by an authenticated STAFF or ADMIN user.
 */
export async function requireAdmin(
  req: NextRequest,
  requiredRole: "STAFF" | "ADMIN" = "STAFF"
): Promise<AdminAuthResult> {
  const auth = await getAuthenticatedUser(req);

  if (!auth) {
    return {
      authorized: false,
      response: apiError(
        "UNAUTHENTICATED",
        "Administrative access requires signing in.",
        401
      ),
    };
  }

  const { profile } = auth;

  // Auto-promote store owner or development setup to ADMIN
  const isOwnerEmail =
    profile.email &&
    (profile.email.toLowerCase() === "mainhasan553@gmail.com" ||
      profile.email.toLowerCase() === "niyatadmin@gmail.com" ||
      profile.email.toLowerCase() === "admin@niyat.com" ||
      profile.email.toLowerCase() === "operations@niyat.com");

  if (profile.role !== "ADMIN" && (process.env.NODE_ENV === "development" || isOwnerEmail)) {
    profile.role = "ADMIN";
    await profile.save();
  }

  if (requiredRole === "ADMIN" && profile.role !== "ADMIN") {
    return {
      authorized: false,
      response: apiError(
        "FORBIDDEN",
        "This operation requires ADMIN privileges.",
        403
      ),
    };
  }

  if (profile.role !== "ADMIN" && profile.role !== "STAFF") {
    return {
      authorized: false,
      response: apiError(
        "FORBIDDEN",
        "You do not have staff or administrator privileges.",
        403
      ),
    };
  }

  return {
    authorized: true,
    context: auth,
  };
}
