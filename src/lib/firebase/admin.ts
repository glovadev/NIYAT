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
 */
export async function verifyIdToken(token: string): Promise<DecodedIdToken | null> {
  try {
    const auth = getAdminAuth();
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error("Firebase ID token verification failed:", error);
    return null;
  }
}

/**
 * Creates a server session cookie from a Firebase ID token
 */
export async function createSessionCookie(
  idToken: string,
  expiresInMs = 1000 * 60 * 60 * 24 * 5 // 5 days
): Promise<string | null> {
  try {
    const auth = getAdminAuth();
    return await auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
  } catch (error) {
    console.error("Failed to create session cookie:", error);
    return null;
  }
}

/**
 * Verifies a server session cookie from the __session cookie
 */
export async function verifySessionCookie(
  cookie: string
): Promise<DecodedIdToken | null> {
  try {
    const auth = getAdminAuth();
    return await auth.verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}
