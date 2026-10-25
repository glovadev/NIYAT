import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { UserProfile } from "@/models/UserProfile";
import { apiSuccess, apiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return apiError("FORBIDDEN", "Dev bypass only available in development mode", 403);
  }

  try {
    await connectToDatabase();

    let profile = await UserProfile.findOne({ email: "admin@niyat.com" });
    if (!profile) {
      profile = await UserProfile.create({
        firebaseUid: "dev_admin_uid_001",
        name: "NIYAT Store Admin",
        email: "admin@niyat.com",
        role: "ADMIN",
        status: "ACTIVE",
      });
    } else if (profile.role !== "ADMIN") {
      profile.role = "ADMIN";
      await profile.save();
    }

    const response = apiSuccess({
      profile: {
        id: String(profile._id),
        firebaseUid: profile.firebaseUid,
        name: profile.name,
        email: profile.email,
        role: "ADMIN",
        wishlist: [],
      },
      message: "Development admin session activated",
    });

    response.cookies.set("__session", "dev-admin-session", {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: false,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed dev login";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  try {
    await connectToDatabase();
    let profile = await UserProfile.findOne({ email: "admin@niyat.com" });
    if (!profile) {
      profile = await UserProfile.create({
        firebaseUid: "dev_admin_uid_001",
        name: "NIYAT Store Admin",
        email: "admin@niyat.com",
        role: "ADMIN",
        status: "ACTIVE",
      });
    } else if (profile.role !== "ADMIN") {
      profile.role = "ADMIN";
      await profile.save();
    }

    const response = NextResponse.redirect(new URL("/admin", req.url));
    response.cookies.set("__session", "dev-admin-session", {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: false,
      path: "/",
      sameSite: "lax",
    });
    return response;
  } catch (err: unknown) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
}
