const SENSITIVE_KEYS = new Set([
  "authorization",
  "x-api-key",
  "cookie",
  "password",
  "secret",
  "token",
  "apikey",
  "api_key",
  "api_secret",
  "webhooksecret",
  "webhook_secret",
]);

export function maskString(str: string, visibleChars = 4): string {
  if (!str) return "";
  if (str.length <= visibleChars) return "***";
  return `${str.slice(0, visibleChars)}...***`;
}

export function sanitizeHeaders(headers: Headers | Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lower) || lower.includes("secret") || lower.includes("token") || lower.includes("key")) {
        sanitized[key] = maskString(value, 3);
      } else {
        sanitized[key] = value;
      }
    });
  } else if (typeof headers === "object" && headers !== null) {
    for (const [key, value] of Object.entries(headers)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lower) || lower.includes("secret") || lower.includes("token") || lower.includes("key")) {
        sanitized[key] = maskString(value, 3);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}

export function sanitizePayload(data: unknown, depth = 0): unknown {
  if (depth > 5) return "[DEPTH_LIMIT]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    // If it looks like a JWT (three base64 parts separated by dots)
    if (/^[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}$/.test(data)) {
      return maskString(data, 6);
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item, depth + 1));
  }

  if (typeof data === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (
        SENSITIVE_KEYS.has(lowerKey) ||
        lowerKey.includes("password") ||
        lowerKey.includes("token") ||
        lowerKey.includes("secret")
      ) {
        sanitizedObj[key] = typeof value === "string" ? maskString(value, 2) : "[MASKED]";
      } else {
        sanitizedObj[key] = sanitizePayload(value, depth + 1);
      }
    }
    return sanitizedObj;
  }

  return data;
}

export function safeLog(prefix: string, message: string, meta?: unknown): void {
  const sanitizedMeta = meta !== undefined ? sanitizePayload(meta) : "";
  if (meta !== undefined) {
    console.log(`[Shiprocket] ${prefix}: ${message}`, sanitizedMeta);
  } else {
    console.log(`[Shiprocket] ${prefix}: ${message}`);
  }
}

export function safeWarn(prefix: string, message: string, meta?: unknown): void {
  const sanitizedMeta = meta !== undefined ? sanitizePayload(meta) : "";
  if (meta !== undefined) {
    console.warn(`[Shiprocket] ${prefix}: ${message}`, sanitizedMeta);
  } else {
    console.warn(`[Shiprocket] ${prefix}: ${message}`);
  }
}

export function safeError(prefix: string, message: string, meta?: unknown): void {
  const sanitizedMeta = meta !== undefined ? sanitizePayload(meta) : "";
  if (meta !== undefined) {
    console.error(`[Shiprocket] ${prefix}: ${message}`, sanitizedMeta);
  } else {
    console.error(`[Shiprocket] ${prefix}: ${message}`);
  }
}

