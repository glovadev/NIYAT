"use client";

import { auth } from "@/lib/firebase/client";

/**
 * Prepares HTTP headers for administrative requests.
 * Injects Firebase ID token if available, and dev bypass headers in development.
 */
export async function getAdminHeaders(initHeaders?: HeadersInit): Promise<Headers> {
  const headers = new Headers(initHeaders || {});

  try {
    if (auth && typeof (auth as any).authStateReady === "function") {
      await (auth as any).authStateReady();
    }
    const currentUser = auth?.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      if (idToken) {
        headers.set("Authorization", `Bearer ${idToken}`);
      }
    }
  } catch (_) {
    // Non-blocking if Firebase client isn't ready
  }

  // If no Firebase ID token, check localStorage for server admin JWT token
  if (!headers.has("Authorization") && typeof window !== "undefined") {
    try {
      const savedToken = localStorage.getItem("niyat_admin_token");
      if (savedToken) {
        headers.set("Authorization", `Bearer ${savedToken}`);
      }
    } catch (_) {}
  }

  // Local development bypass fallback
  if (process.env.NODE_ENV === "development" && !headers.has("Authorization")) {
    headers.set("x-dev-admin", "true");
    headers.set("Authorization", "Bearer dev-admin-session");
  }

  return headers;
}

/**
 * Raw fetch wrapper for admin requests that preserves standard Response interface,
 * with automatic credentials: "include" and Authorization Bearer token injection.
 */
export async function adminRawFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await getAdminHeaders(options.headers);
  return fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });
}

/**
 * Universal safe fetcher for administrative operations.
 * Automatically injects Firebase Auth bearer token (or local dev bypass headers),
 * and safely handles HTML/500/404 server responses so it never throws:
 * "Unexpected token '<', '<!DOCTYPE '... is not valid JSON".
 */
export async function adminFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: { message: string; code?: string } }> {
  try {
    const res = await adminRawFetch(url, options);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      const isHtml = text.trim().startsWith("<");
      const errorMsg = isHtml
        ? `Server returned HTTP ${res.status} (${res.statusText || "Internal Error"}). Please verify backend services.`
        : text || `HTTP ${res.status}`;

      return {
        ok: false,
        status: res.status,
        error: { message: errorMsg, code: `HTTP_${res.status}` },
      };
    }

    const json = await res.json();
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        status: res.status,
        data: json.data,
        error: {
          message: json.error?.message || `Request failed with status ${res.status}`,
          code: json.error?.code,
        },
      };
    }

    return {
      ok: true,
      status: res.status,
      data: json.data !== undefined ? json.data : json,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network request failed";
    return {
      ok: false,
      status: 0,
      error: { message, code: "NETWORK_ERROR" },
    };
  }
}
