import "server-only";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyIdToken, verifySessionCookie } from "@/lib/firebase/admin";
import { connectToDatabase } from "@/lib/db/mongoose";
import { UserProfile, IUserProfile } from "@/models/UserProfile";
import { DecodedIdToken } from "firebase-admin/auth";

export interface AuthenticatedContext {
  token: DecodedIdToken;
  profile: IUserProfile;
}

/**
 * Extracts and verifies authentication identity from either:
 * 1. Authorization: Bearer <FirebaseIdToken> header (Route Handlers / API requests)
 * 2. __session=<FirebaseSessionCookie> cookie (Server Components & SSR)
 */
export async function getAuthenticatedUser(
  req?: NextRequest
): Promise<AuthenticatedContext | null> {
  try {
    let decoded: DecodedIdToken | null = null;

    // 1. Development mode fast bypass (Header, Bearer, or Cookie)
    if (process.env.NODE_ENV === "development") {
      const devHeader = req?.headers.get("x-dev-admin");
      const authHeader = req?.headers.get("authorization");
      let devCookie = req?.cookies.get("__session")?.value;
      if (!devCookie) {
        try {
          const cookieStore = await cookies();
          devCookie = cookieStore.get("__session")?.value;
        } catch (_) {}
      }

      if (
        devHeader === "true" ||
        authHeader === "Bearer dev-admin-session" ||
        devCookie === "dev-admin-session"
      ) {
        await connectToDatabase();
        let devProfile = await UserProfile.findOne({ email: "admin@niyat.com" });
        if (!devProfile) {
          devProfile = await UserProfile.create({
            firebaseUid: "dev_admin_uid_001",
            name: "NIYAT Store Admin",
            email: "admin@niyat.com",
            role: "ADMIN",
            status: "ACTIVE",
          });
        } else if (devProfile.role !== "ADMIN") {
          devProfile.role = "ADMIN";
          await devProfile.save();
        }
        return {
          token: { uid: devProfile.firebaseUid, email: devProfile.email } as any,
          profile: devProfile,
        };
      }
    }

    // 2. Try Bearer token from request headers
    const authHeader = req?.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.substring(7).trim();
      if (idToken) {
        decoded = await verifyIdToken(idToken);
      }
    }

    // 3. Fall back to __session cookie
    if (!decoded) {
      let sessionCookie: string | undefined;

      if (req) {
        sessionCookie = req.cookies.get("__session")?.value;
      } else {
        const cookieStore = await cookies();
        sessionCookie = cookieStore.get("__session")?.value;
      }

      if (sessionCookie) {

        decoded = await verifySessionCookie(sessionCookie);
        // Fallback for development if sessionCookie contains the idToken
        if (!decoded) {
          decoded = await verifyIdToken(sessionCookie);
        }
      }
    }

    if (!decoded || !decoded.uid) {
      return null;
    }

    // 3. Load or link UserProfile in MongoDB
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
      return null;
    }

    return {
      token: decoded,
      profile,
    };
  } catch (error) {
    console.error("Authentication extraction error:", error);
    return null;
  }
}
