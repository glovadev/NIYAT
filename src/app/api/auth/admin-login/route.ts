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

    await connectToDatabase();

    // Check store owner / admin recognized accounts
    const isOwner =
      email === "mainhasan553@gmail.com" ||
      email === "admin@niyat.com" ||
      email === "operations@niyat.com";

    // Standard configured master password from environment (or default master password)
    const configuredMasterPassword = process.env.ADMIN_PASSWORD || "Niyat@2026!";

    let profile = await UserProfile.findOne({ email });

    if (!profile) {
      if (isOwner) {
        // Auto-provision owner profile
        profile = await UserProfile.create({
          firebaseUid: `admin_${Date.now()}`,
          name: "NIYAT Store Administrator",
          email,
          role: "ADMIN",
          status: "ACTIVE",
          communicationPreferences: { marketingEmail: false },
        });
      } else {
        return apiError("UNAUTHORIZED", "Invalid admin credentials", 401);
      }
    }

    if (profile.status === "DISABLED") {
      return apiError("FORBIDDEN", "Admin account is disabled", 403);
    }

    // Verify credentials: check master password or stored password hash
    let passwordValid = false;

    if (password === configuredMasterPassword) {
      passwordValid = true;
    } else if (profile.passwordHash) {
      passwordValid = verifyPassword(password, profile.passwordHash);
    }

    if (!passwordValid) {
      return apiError("UNAUTHORIZED", "Invalid admin email or security password", 401);
    }

    // Ensure ADMIN role
    if (profile.role !== "ADMIN" && isOwner) {
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
      message: "Administrator session established",
    });

    response.cookies.set({
      name: "__session",
      value: token,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Authentication failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
