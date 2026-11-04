import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { UserProfile } from "@/models/UserProfile";
import { apiSuccess, apiError } from "@/lib/api/response";
import { verifyPassword } from "@/lib/auth/password";
import jwt from "jsonwebtoken";
import { serverEnv } from "@/lib/config/env";
import { z } from "zod";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid email or password",
        400
      );
    }

    const { email, password } = parsed.data;
    await connectToDatabase();

    const normalizedEmail = email.toLowerCase().trim();

    // Look for distributor or admin account
    const user = await UserProfile.findOne({
      email: normalizedEmail,
      role: { $in: ["DISTRIBUTOR", "ADMIN"] },
    });

    if (!user) {
      return apiError(
        "INVALID_CREDENTIALS",
        "No distributor account found with this email address. Please contact NIYAT wholesale team.",
        401
      );
    }

    if (user.status === "DISABLED") {
      return apiError(
        "ACCOUNT_DISABLED",
        "Your distributor account has been suspended. Please contact NIYAT administration.",
        403
      );
    }

    // Verify password if passwordHash exists
    if (user.passwordHash) {
      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return apiError("INVALID_CREDENTIALS", "Incorrect distributor password.", 401);
      }
    } else {
      // If user was created without passwordHash (e.g. dev admin or legacy),
      // allow default master password or dev password in non-production
      if (process.env.NODE_ENV !== "development" && password !== "Admin@123") {
        return apiError("INVALID_CREDENTIALS", "Invalid credentials.", 401);
      }
    }

    // Generate distributor JWT session token
    const tokenPayload = {
      uid: user.firebaseUid,
      profileId: String(user._id),
      email: user.email,
      role: user.role,
      name: user.name,
      companyName: user.companyName,
    };

    const sessionToken = jwt.sign(tokenPayload, serverEnv.JWT_SECRET, {
      expiresIn: "30d",
    });

    const response = apiSuccess({
      distributor: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        companyName: user.companyName || user.name,
        gstNumber: user.gstNumber || "",
        role: user.role,
        status: user.status,
      },
      token: sessionToken,
      message: "Distributor authenticated successfully",
    });

    // Set HTTP-only cookies for SSR and API calls
    response.cookies.set("__distributor_session", sessionToken, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    response.cookies.set("__session", sessionToken, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Distributor login failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

