import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db/mongoose";
import { UserProfile } from "@/models/UserProfile";
import { serverEnv } from "@/lib/config/env";
import { apiSuccess, apiError } from "@/lib/api/response";
import { verifyPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email || "").trim().toLowerCase();
    const password = (body?.password || "").trim();

    if (!email || !password) {
      return apiError("VALIDATION_ERROR", "Email and password are required", 400);
    }

    // Require valid, non-empty ADMIN_PASSWORD environment variable (FAIL SECURE)
    const configuredMasterPassword = process.env.ADMIN_PASSWORD?.trim();
    if (!configuredMasterPassword) {
      console.error("[Security] Administrator login attempted but ADMIN_PASSWORD environment variable is missing or empty");
      return apiError(
        "AUTH_UNAVAILABLE",
        "Administrator authentication is currently unavailable.",
        500
      );
    }

    await connectToDatabase();

    // Recognized store owner / admin accounts
    const recognizedAdminEmails = [
      "mainhasan553@gmail.com",
      "niyatadmin@gmail.com",
      "admin@niyat.com",
      "operations@niyat.com",
    ];

    const isRecognizedAdmin = recognizedAdminEmails.includes(email);

    let profile = await UserProfile.findOne({ email });

    if (!profile) {
      if (isRecognizedAdmin) {
        // Auto-provision owner/admin profile
        profile = await UserProfile.create({
          firebaseUid: `admin_${Date.now()}`,
          name: email.split("@")[0].toUpperCase() + " (Admin)",
          email,
          role: "ADMIN",
          status: "ACTIVE",
          communicationPreferences: { marketingEmail: false },
        });
      } else {
        return apiError("UNAUTHORIZED", "Invalid administrator credentials", 401);
      }
    }

    if (profile.status === "DISABLED") {
      return apiError("FORBIDDEN", "Admin account is disabled", 403);
    }

    // Verify credentials: check master password (constant-time) or stored password hash
    let passwordValid = false;

    if (configuredMasterPassword) {
      const crypto = await import("crypto");
      const a = Buffer.from(password, "utf8");
      const b = Buffer.from(configuredMasterPassword, "utf8");
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        passwordValid = true;
      }
    }

    if (!passwordValid && profile.passwordHash) {
      passwordValid = verifyPassword(password, profile.passwordHash);
    }

    if (!passwordValid) {
      return apiError("UNAUTHORIZED", "Invalid admin email or security password", 401);
    }

    // Ensure recognized admin accounts have ADMIN role
    if (isRecognizedAdmin && profile.role !== "ADMIN") {
      profile.role = "ADMIN";
      await profile.save();
    }

    if (profile.role !== "ADMIN" && profile.role !== "STAFF") {
      return apiError("FORBIDDEN", "Account does not have administrator privileges", 403);
    }

    // Generate signed JWT session
    const token = jwt.sign(
      {
        uid: profile.firebaseUid,
        profileId: profile._id.toString(),
        email: profile.email,
        email_verified: true,
        name: profile.name,
        role: profile.role,
      },
      serverEnv.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = apiSuccess({
      profile: {
        id: String(profile._id),
        firebaseUid: profile.firebaseUid,
        name: profile.name,
        email: profile.email,
        role: profile.role,
      },
      token,
      message: "Administrator session established",
    });

    const isHttps =
      req.nextUrl?.protocol === "https:" ||
      req.headers.get("x-forwarded-proto") === "https" ||
      process.env.SITE_URL?.startsWith("https://");

    response.cookies.set({
      name: "__session",
      value: token,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: Boolean(isHttps),
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Authentication failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

