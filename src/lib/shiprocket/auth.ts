import { CachedToken, ShiprocketAuthTokenResponse } from "./types";
import { getShiprocketConfig } from "./config";
import { ShiprocketAuthError, ShiprocketTimeoutError, classifyShiprocketHttpError } from "./errors";
import { safeLog, safeWarn, safeError } from "./sanitize";

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
const REFRESH_BUFFER_MS = 60 * 60 * 1000; // Refresh 1 hour before nominal expiry

export class ShiprocketAuthManager {
  private static instance: ShiprocketAuthManager | null = null;
  private cachedToken: CachedToken | null = null;
  private inFlightAuthPromise: Promise<string> | null = null;
  private fetchFn: typeof fetch = fetch.bind(globalThis);

  public static getInstance(): ShiprocketAuthManager {
    if (!ShiprocketAuthManager.instance) {
      ShiprocketAuthManager.instance = new ShiprocketAuthManager();
    }
    return ShiprocketAuthManager.instance;
  }

  // Exposed for isolated testing
  public static resetInstance(): void {
    ShiprocketAuthManager.instance = null;
  }

  public setFetchFnForTesting(fn?: typeof fetch): void {
    this.fetchFn = fn || fetch.bind(globalThis);
  }

  public invalidateToken(): void {
    safeWarn("Auth", "Invalidating cached Shiprocket auth token");
    this.cachedToken = null;
  }

  public getCachedTokenForTesting(): CachedToken | null {
    return this.cachedToken;
  }

  public setCachedTokenForTesting(token: string, expiresAt: number): void {
    this.cachedToken = { token, expiresAt };
  }

  public isTokenValid(): boolean {
    if (!this.cachedToken) return false;
    return Date.now() < this.cachedToken.expiresAt;
  }

  public async getToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.isTokenValid()) {
      return this.cachedToken!.token;
    }

    // Deduplicate concurrent refresh requests (single-flight)
    if (this.inFlightAuthPromise) {
      return this.inFlightAuthPromise;
    }

    this.inFlightAuthPromise = this.performLogin()
      .finally(() => {
        this.inFlightAuthPromise = null;
      });

    return this.inFlightAuthPromise;
  }

  private async performLogin(): Promise<string> {
    const config = getShiprocketConfig();
    const loginUrl = `${config.baseUrl}/auth/login`;

    safeLog("Auth", `Authenticating with Shiprocket as ${config.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.requestTimeoutMs);

    try {
      const response = await this.fetchFn(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: config.email,
          password: config.password,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await response.json().catch(() => ({}))) as ShiprocketAuthTokenResponse;

      if (!response.ok || !data.token) {
        throw classifyShiprocketHttpError(response.status, data, "/auth/login", response.headers);
      }

      this.cachedToken = {
        token: data.token,
        expiresAt: Date.now() + TEN_DAYS_MS - REFRESH_BUFFER_MS,
      };

      safeLog("Auth", "Shiprocket authentication token acquired and cached successfully");
      return this.cachedToken.token;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        safeError("Auth", "Shiprocket authentication request timed out");
        throw new ShiprocketTimeoutError("Shiprocket authentication timed out", "/auth/login");
      }

      if (err instanceof ShiprocketAuthError) {
        safeError("Auth", "Invalid Shiprocket credentials supplied");
        throw err;
      }

      safeError("Auth", "Shiprocket authentication failed", err instanceof Error ? err.message : String(err));
      throw err;
    }
  }
}

export const shiprocketAuth = ShiprocketAuthManager.getInstance();

