import "server-only";
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth, DecodedIdToken } from "firebase-admin/auth";
import { serverEnv } from "@/lib/config/env";

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = serverEnv.FIREBASE_PROJECT_ID || "niyat-29baf";
  const clientEmail = serverEnv.FIREBASE_CLIENT_EMAIL;
  let privateKey = serverEnv.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Format escaped newlines in private key
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (clientEmail && privateKey) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      return adminApp;
    } catch (err) {
      console.warn("Failed to initialize Firebase Admin with service account credentials, falling back to projectId:", err);
    }
  }

  try {
    adminApp = initializeApp({
      projectId,
    });
  } catch (err) {
    if (getApps().length > 0) {
      return getApps()[0];
    }
    throw err;
  }

  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/**
 * Verifies a Firebase ID token using the official Firebase Admin SDK.
 * Cryptographically checks signature against Google's public certificates,
 * verifies project ID audience, issuer (https://securetoken.google.com/<projectId>),
 * expiration, issue time, and auth time.
 *
 * Fails closed and returns null if Admin SDK is unavailable or verification fails.
 */
export async function verifyIdToken(token: string): Promise<DecodedIdToken | null> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return null;
  }

  // Primary production verification: Firebase Admin SDK
  try {
    const auth = getAdminAuth();
    if (auth) {
      const decoded = await auth.verifyIdToken(token);
      if (
        decoded &&
        typeof decoded.uid === "string" &&
        decoded.uid.trim().length > 0 &&
        Number.isFinite(decoded.exp) &&
        Number.isFinite(decoded.iat) &&
        Number.isFinite(decoded.auth_time)
      ) {
        return decoded;
      }
    }
  } catch (err: unknown) {
    // If Admin SDK explicitly rejects token (bad signature, expired, wrong project, revoked), fail closed
  }

  // STRICT SECURITY: Fail closed. Never use unverified decoding or generic tokeninfo.
  return null;
}

/**
 * Creates a server session cookie from a Firebase ID token
 */
export async function createSessionCookie(
  idToken: string,
  expiresInMs = 1000 * 60 * 60 * 24 * 5 // 5 days
): Promise<string | null> {
  // If service account is configured, try Firebase Admin SDK
  if (serverEnv.FIREBASE_CLIENT_EMAIL && serverEnv.FIREBASE_PRIVATE_KEY) {
    try {
      const auth = getAdminAuth();
      return await auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
    } catch (_) {}
  }

  // Fallback: create signed JWT session using server JWT_SECRET
  try {
    const decoded = await verifyIdToken(idToken);
    if (decoded && decoded.uid) {
      const jwt = (await import("jsonwebtoken")).default;
      return jwt.sign(
        { uid: decoded.uid, email: decoded.email, name: decoded.name },
        serverEnv.JWT_SECRET,
        { expiresIn: "5d" }
      );
    }
  } catch (_) {}
  return null;
}

/**
 * Verifies a server session cookie from the __session cookie
 */
export async function verifySessionCookie(
  cookie: string
): Promise<DecodedIdToken | null> {
  // 1. Fast path: check JWT session signed with server JWT_SECRET
  try {
    const jwt = (await import("jsonwebtoken")).default;
    const payload = jwt.verify(cookie, serverEnv.JWT_SECRET) as any;
    if (payload && typeof payload.uid === "string" && payload.uid.trim().length > 0) {
      const expNum = typeof payload.exp === "number" ? payload.exp : NaN;
      const iatNum = typeof payload.iat === "number" ? payload.iat : NaN;
      const authTimeNum = typeof payload.auth_time === "number" ? payload.auth_time : iatNum;
      const nowSec = Math.floor(Date.now() / 1000);

      if (Number.isFinite(expNum) && expNum > nowSec && Number.isFinite(iatNum)) {
        return {
          uid: payload.uid,
          email: payload.email,
          email_verified: payload.email_verified === true,
          name: payload.name,
          role: payload.role,
          auth_time: Number.isFinite(authTimeNum) ? authTimeNum : nowSec,
          user_id: payload.uid,
          sub: payload.uid,
          iat: iatNum,
          exp: expNum,
          iss: "niyat-server",
          aud: "niyat-app",
          firebase: { identities: {}, sign_in_provider: "custom" },
        } as DecodedIdToken;
      }
    }
  } catch (_) {}

  // 2. If service account is configured, try Firebase Admin SDK
  if (serverEnv.FIREBASE_CLIENT_EMAIL && serverEnv.FIREBASE_PRIVATE_KEY) {
    try {
      const auth = getAdminAuth();
      return await auth.verifySessionCookie(cookie, true);
    } catch (_) {}
  }

  return null;
}
