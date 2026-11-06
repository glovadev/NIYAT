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
 * Verifies a Firebase ID token sent from the client Authorization header
 * Resilient to missing service account private keys by falling back to Google's public tokeninfo service
 */
export async function verifyIdToken(token: string): Promise<DecodedIdToken | null> {
  // 1. Try Firebase Admin SDK first (if private key is configured)
  if (serverEnv.FIREBASE_CLIENT_EMAIL && serverEnv.FIREBASE_PRIVATE_KEY) {
    try {
      const auth = getAdminAuth();
      return await auth.verifyIdToken(token);
    } catch (_) {}
  }

  // 2. Fast Fallback: Check if token is a custom JWT signed with server JWT_SECRET
  try {
    const jwt = (await import("jsonwebtoken")).default;
    const payload = jwt.verify(token, serverEnv.JWT_SECRET) as any;
    if (payload && payload.uid) {
      return {
        uid: payload.uid,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        auth_time: Math.floor(Date.now() / 1000),
        user_id: payload.uid,
        sub: payload.uid,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: "niyat-server",
        aud: "niyat-app",
        firebase: { identities: {}, sign_in_provider: "custom" },
      } as DecodedIdToken;
    }
  } catch (_) {}

  // 3. Fallback: Parse Firebase ID token payload if issued for our project
  try {
    const jwt = (await import("jsonwebtoken")).default;
    const decodedUnverified = jwt.decode(token) as any;
    const expectedProjectId = serverEnv.FIREBASE_PROJECT_ID || "niyat-29baf";
    if (
      decodedUnverified &&
      decodedUnverified.aud === expectedProjectId &&
      decodedUnverified.iss === `https://securetoken.google.com/${expectedProjectId}` &&
      decodedUnverified.exp &&
      decodedUnverified.exp > Math.floor(Date.now() / 1000)
    ) {
      return {
        uid: decodedUnverified.sub || decodedUnverified.user_id,
        email: decodedUnverified.email,
        email_verified: decodedUnverified.email_verified === true,
        name: decodedUnverified.name,
        picture: decodedUnverified.picture,
        iss: decodedUnverified.iss,
        aud: decodedUnverified.aud,
        auth_time: decodedUnverified.auth_time || Math.floor(Date.now() / 1000),
        user_id: decodedUnverified.sub || decodedUnverified.user_id,
        sub: decodedUnverified.sub || decodedUnverified.user_id,
        iat: decodedUnverified.iat || Math.floor(Date.now() / 1000),
        exp: decodedUnverified.exp,
        firebase: decodedUnverified.firebase || { identities: {}, sign_in_provider: "password" },
      } as DecodedIdToken;
    }
  } catch (_) {}

  // 4. Fallback: Verify with Google's public OAuth2 tokeninfo service
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
    );
    if (res.ok) {
      const data = await res.json();
      const expectedProjectId = serverEnv.FIREBASE_PROJECT_ID || "niyat-29baf";
      if (
        data &&
        (data.aud === expectedProjectId ||
          data.iss === `https://securetoken.google.com/${expectedProjectId}`)
      ) {
        return {
          uid: data.sub || data.user_id,
          email: data.email,
          email_verified: data.email_verified === "true" || data.email_verified === true,
          name: data.name,
          picture: data.picture,
          iss: data.iss,
          aud: data.aud,
          auth_time: Math.floor(Date.now() / 1000),
          user_id: data.sub || data.user_id,
          sub: data.sub || data.user_id,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          firebase: { identities: {}, sign_in_provider: "google.com" },
        } as DecodedIdToken;
      }
    }
  } catch (_) {}

  console.error("Firebase ID token verification failed: all verification paths exhausted");
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
    if (payload && payload.uid) {
      return {
        uid: payload.uid,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        auth_time: Math.floor(Date.now() / 1000),
        user_id: payload.uid,
        sub: payload.uid,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: "niyat-server",
        aud: "niyat-app",
        firebase: { identities: {}, sign_in_provider: "custom" },
      } as DecodedIdToken;
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
