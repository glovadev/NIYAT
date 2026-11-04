"use client";

import { auth } from "@/lib/firebase/client";

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
  const headers = new Headers(options.headers || {});

  try {
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

  // Local development bypass fallback
  if (process.env.NODE_ENV === "development" && !headers.has("Authorization")) {
    headers.set("x-dev-admin", "true");
    headers.set("Authorization", "Bearer dev-admin-session");
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

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
