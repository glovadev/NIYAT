import { ShiprocketRequestOptions, ShiprocketResponse } from "./types";
import { getShiprocketConfig } from "./config";
import { ShiprocketAuthManager } from "./auth";
import {
  ShiprocketError,
  ShiprocketAuthError,
  ShiprocketTimeoutError,
  ShiprocketRateLimitError,
  classifyShiprocketHttpError,
} from "./errors";
import { safeLog, safeWarn, safeError, sanitizePayload, sanitizeHeaders } from "./sanitize";

export interface ShiprocketClientOptions {
  authManager?: ShiprocketAuthManager;
  fetchFn?: typeof fetch;
}

export class ShiprocketClient {
  private authManager: ShiprocketAuthManager;
  private fetchFn: typeof fetch;

  constructor(options?: ShiprocketClientOptions) {
    this.authManager = options?.authManager || ShiprocketAuthManager.getInstance();
    this.fetchFn = options?.fetchFn || fetch.bind(globalThis);
  }

  public async get<T>(endpoint: string, options?: Omit<ShiprocketRequestOptions, "method">): Promise<T> {
    const res = await this.request<T>(endpoint, {
      ...options,
      method: "GET",
      allowRetry: options?.allowRetry ?? true,
    });
    return res.data;
  }

  public async post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<ShiprocketRequestOptions, "method" | "body">
  ): Promise<T> {
    const res = await this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body,
      allowRetry: options?.allowRetry ?? false, // Default: false for mutations
    });
    return res.data;
  }

  public async put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<ShiprocketRequestOptions, "method" | "body">
  ): Promise<T> {
    const res = await this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body,
      allowRetry: options?.allowRetry ?? false,
    });
    return res.data;
  }

  public async delete<T>(endpoint: string, options?: Omit<ShiprocketRequestOptions, "method">): Promise<T> {
    const res = await this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
      allowRetry: options?.allowRetry ?? false,
    });
    return res.data;
  }

  public async request<T>(endpoint: string, options: ShiprocketRequestOptions = {}): Promise<ShiprocketResponse<T>> {
    const config = getShiprocketConfig();
    const method = options.method || "GET";
    const allowRetry = options.allowRetry ?? (method === "GET");
    const maxRetries = allowRetry ? (options.maxRetries ?? config.maxRetries) : 0;
    const timeoutMs = options.timeoutMs ?? config.requestTimeoutMs;

    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    let url = `${config.baseUrl}${normalizedEndpoint}`;

    if (options.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    let attempt = 0;
    let authRetried = false;

    while (attempt <= maxRetries) {
      attempt++;
      const token = await this.authManager.getToken();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const requestHeaders: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      };

      safeLog("Client", `${method} ${normalizedEndpoint} (attempt ${attempt}/${maxRetries + 1})`, {
        headers: sanitizeHeaders(requestHeaders),
        params: options.params,
        body: options.body ? sanitizePayload(options.body) : undefined,
      });

      try {
        const response = await this.fetchFn(url, {
          method,
          headers: requestHeaders,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let responseData: unknown = null;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          responseData = await response.json().catch(() => ({}));
        } else {
          const text = await response.text().catch(() => "");
          try {
            responseData = JSON.parse(text);
          } catch {
            responseData = { raw: text };
          }
        }

        if (response.ok) {
          return {
            status: response.status,
            headers: response.headers,
            data: responseData as T,
          };
        }

        // If 401 Unauthorized, token may have expired or been revoked out-of-band
        if (response.status === 401 && !authRetried) {
          authRetried = true;
          safeWarn("Client", "401 Unauthorized encountered. Invalidating cached token and refreshing once...");
          this.authManager.invalidateToken();
          continue; // Retry once with fresh token without counting as an attempt
        }

        const classifiedError = classifyShiprocketHttpError(
          response.status,
          responseData,
          normalizedEndpoint,
          response.headers
        );

        if (!allowRetry || !classifiedError.isRetryable || attempt > maxRetries) {
          throw classifiedError;
        }

        // Rate limit backoff vs exponential backoff
        let delayMs = 500 * Math.pow(2, attempt - 1);
        if (classifiedError instanceof ShiprocketRateLimitError) {
          delayMs = Math.max(delayMs, classifiedError.retryAfterSeconds * 1000);
        }
        // Add jitter (up to 20%)
        const jitter = Math.floor(Math.random() * (delayMs * 0.2));
        const totalDelay = Math.min(delayMs + jitter, 10000);

        safeWarn(
          "Client",
          `Retryable error (${classifiedError.statusCode}) on ${normalizedEndpoint}. Waiting ${totalDelay}ms before retry ${attempt}/${maxRetries}...`
        );
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      } catch (err: unknown) {
        clearTimeout(timeoutId);

        let finalError: ShiprocketError;
        if (err instanceof ShiprocketError) {
          finalError = err;
        } else if (err instanceof Error && err.name === "AbortError") {
          finalError = new ShiprocketTimeoutError(
            `Request to Shiprocket ${normalizedEndpoint} timed out after ${timeoutMs}ms`,
            normalizedEndpoint
          );
        } else {
          finalError = classifyShiprocketHttpError(0, { message: String(err) }, normalizedEndpoint);
        }

        if (!allowRetry || !finalError.isRetryable || attempt > maxRetries) {
          safeError("Client", `Request to ${normalizedEndpoint} failed decisively: ${finalError.message}`);
          throw finalError;
        }

        const delayMs = Math.min(500 * Math.pow(2, attempt - 1) + Math.random() * 200, 10000);
        safeWarn(
          "Client",
          `Transient error on ${normalizedEndpoint} (${finalError.message}). Retrying in ${Math.round(delayMs)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new ShiprocketTimeoutError(`Exceeded maximum retries for ${normalizedEndpoint}`, normalizedEndpoint);
  }
}

export const shiprocketClient = new ShiprocketClient();

