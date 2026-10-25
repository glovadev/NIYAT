import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, createSessionCookie } from "@/lib/firebase/admin";
import { connectToDatabase } from "@/lib/db/mongoose";
import { UserProfile } from "@/models/UserProfile";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idToken = body?.idToken;

    if (!idToken || typeof idToken !== "string") {
      return apiError("VALIDATION_ERROR", "idToken is required", 400);
    }

    const decoded = await verifyIdToken(idToken);
    if (!decoded) {
      return apiError("UNAUTHENTICATED", "Invalid or expired Firebase ID token", 401);
    }

    // Connect to DB and sync UserProfile
    await connectToDatabase();
    let profile = await UserProfile.findOne({ firebaseUid: decoded.uid });

    if (!profile) {
      profile = await UserProfile.create({
        firebaseUid: decoded.uid,
        name: decoded.name || decoded.email?.split("@")[0] || "Customer",
        email: decoded.email,
        role: "CUSTOMER",
        status: "ACTIVE",
        communicationPreferences: { marketingEmail: false },
      });
    }

    if (profile.status === "DISABLED") {
      return apiError("FORBIDDEN", "Your account is disabled. Please contact support.", 403);
    }

    // Create session cookie for 5 days
    let sessionCookie = await createSessionCookie(idToken);
    if (!sessionCookie) {
      // In local dev without private key service account, fallback to idToken as session cookie
      sessionCookie = idToken;
    }

    const response = apiSuccess({
      profile: {
        id: String(profile._id),
        firebaseUid: profile.firebaseUid,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        wishlist: profile.wishlist || [],
      },
    });

    // Set secure HTTP-only session cookie
    response.cookies.set({
      name: "__session",
      value: sessionCookie,
      maxAge: 60 * 60 * 24 * 5, // 5 days in seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Authentication error";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function DELETE() {
  const response = apiSuccess({ message: "Successfully logged out" });

  response.cookies.set({
    name: "__session",
    value: "",
    maxAge: 0,
    path: "/",
  });

  return response;
}
