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
    const isEmailVerified = decoded.email_verified === true;
    let profile = await UserProfile.findOne({
      $or: [
        { firebaseUid: decoded.uid },
        ...(decoded.email && isEmailVerified
          ? [{ email: decoded.email.toLowerCase() }]
          : []),
      ],
    });

    const isOwnerEmail =
      isEmailVerified &&
      decoded.email &&
      (decoded.email.toLowerCase() === "mainhasan553@gmail.com" ||
        decoded.email.toLowerCase() === "niyatadmin@gmail.com" ||
        decoded.email.toLowerCase() === "admin@niyat.com" ||
        decoded.email.toLowerCase() === "operations@niyat.com");

    if (!profile) {
      profile = await UserProfile.create({
        firebaseUid: decoded.uid,
        name: decoded.name || decoded.email?.split("@")[0] || "Administrator",
        email: decoded.email?.toLowerCase(),
        role: isOwnerEmail ? "ADMIN" : "CUSTOMER",
        status: "ACTIVE",
        communicationPreferences: { marketingEmail: false },
      });
    } else {
      if (profile.firebaseUid !== decoded.uid && isEmailVerified) {
        profile.firebaseUid = decoded.uid;
      }
      if (isOwnerEmail && profile.role !== "ADMIN") {
        profile.role = "ADMIN";
      }
      await profile.save();
    }

    if (profile.status === "DISABLED") {
      return apiError("FORBIDDEN", "Your account is disabled. Please contact support.", 403);
    }

    // Create secure session cookie for 5 days
    let sessionCookie = await createSessionCookie(idToken);
    if (!sessionCookie) {
      if (process.env.NODE_ENV === "development") {
        // Only in local development: fallback to verified idToken
        sessionCookie = idToken;
      } else {
        // Production: fail closed to prevent insecure session establishment
        return apiError("UNAUTHENTICATED", "Failed to establish cryptographically secure session", 401);
      }
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

    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" ||
      req.nextUrl?.protocol === "https:" ||
      process.env.NODE_ENV === "production";

    // Set secure HTTP-only session cookie
    response.cookies.set({
      name: "__session",
      value: sessionCookie,
      maxAge: 60 * 60 * 24 * 5, // 5 days in seconds
      httpOnly: true,
      secure: isHttps,
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
