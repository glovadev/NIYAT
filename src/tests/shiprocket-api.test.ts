import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  ShiprocketAuthManager,
  ShiprocketClient,
  getShiprocketConfig,
  classifyShiprocketHttpError,
  ShiprocketAuthError,
  ShiprocketConfigError,
  ShiprocketRateLimitError,
  ShiprocketServerError,
  ShiprocketTimeoutError,
  ShiprocketValidationError,
  sanitizeHeaders,
  sanitizePayload,
  maskString,
} from "../lib/shiprocket";

describe("Shiprocket API Foundation Unit Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    ShiprocketAuthManager.resetInstance();
    process.env.SHIPROCKET_API_EMAIL = "ops@niyat.in";
    process.env.SHIPROCKET_API_PASSWORD = "secret_password_123";
    process.env.SHIPROCKET_WAREHOUSE_PIN = "560001";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    ShiprocketAuthManager.resetInstance();
  });

  describe("Configuration & On-Demand Validation", () => {
    test("throws ShiprocketConfigError when credentials are missing", () => {
      delete process.env.SHIPROCKET_API_EMAIL;
      delete process.env.SHIPROCKET_API_PASSWORD;

      assert.throws(() => getShiprocketConfig(), (err: unknown) => {
        assert.ok(err instanceof ShiprocketConfigError);
        assert.match(err.message, /credentials not configured/i);
        return true;
      });
    });

    test("throws ShiprocketConfigError when warehouse pickup PIN is missing or invalid", () => {
      delete process.env.SHIPROCKET_WAREHOUSE_PIN;

      assert.throws(() => getShiprocketConfig(), (err: unknown) => {
        assert.ok(err instanceof ShiprocketConfigError);
        assert.match(err.message, /warehouse pickup PIN code/i);
        return true;
      });

      process.env.SHIPROCKET_WAREHOUSE_PIN = "1234"; // not 6 digits
      assert.throws(() => getShiprocketConfig(), (err: unknown) => {
        assert.ok(err instanceof ShiprocketConfigError);
        assert.match(err.message, /warehouse pickup PIN code/i);
        return true;
      });
    });

    test("returns config when credentials are provided", () => {
      process.env.SHIPROCKET_API_EMAIL = "ops@niyat.in";
      process.env.SHIPROCKET_API_PASSWORD = "secret_password_123";
      process.env.SHIPROCKET_DEFAULT_PICKUP_LOCATION = "Main_Warehouse";
      process.env.SHIPROCKET_WAREHOUSE_PIN = "560001";

      const config = getShiprocketConfig();
      assert.strictEqual(config.email, "ops@niyat.in");
      assert.strictEqual(config.password, "secret_password_123");
      assert.strictEqual(config.defaultPickupLocation, "Main_Warehouse");
      assert.strictEqual(config.warehousePin, "560001");
      assert.strictEqual(config.baseUrl, "https://apiv2.shiprocket.in/v1/external");
      assert.strictEqual(config.requestTimeoutMs, 10000);
      assert.strictEqual(config.maxRetries, 2);
    });
  });

  describe("Token Caching & Safe Refresh", () => {
    test("caches token and reuses it while valid", async () => {
      process.env.SHIPROCKET_API_EMAIL = "ops@niyat.in";
      process.env.SHIPROCKET_API_PASSWORD = "secret_password_123";

      let loginCallCount = 0;
      const mockFetch: typeof fetch = async (url) => {
        if (String(url).includes("/auth/login")) {
          loginCallCount++;
          return new Response(JSON.stringify({ token: "test_jwt_token_abc123" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not found", { status: 404 });
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        const auth = ShiprocketAuthManager.getInstance();
        const token1 = await auth.getToken();
        assert.strictEqual(token1, "test_jwt_token_abc123");
        assert.strictEqual(loginCallCount, 1);

        // Second call should return cached token without calling login again
        const token2 = await auth.getToken();
        assert.strictEqual(token2, "test_jwt_token_abc123");
        assert.strictEqual(loginCallCount, 1);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("deduplicates concurrent login requests (single-flight mutex)", async () => {
      process.env.SHIPROCKET_API_EMAIL = "ops@niyat.in";
      process.env.SHIPROCKET_API_PASSWORD = "secret_password_123";

      let loginCallCount = 0;
      const mockFetch: typeof fetch = async (url) => {
        if (String(url).includes("/auth/login")) {
          loginCallCount++;
          // Simulate network latency
          await new Promise((resolve) => setTimeout(resolve, 50));
          return new Response(JSON.stringify({ token: "concurrent_token_xyz" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not found", { status: 404 });
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        const auth = ShiprocketAuthManager.getInstance();
        // Fire 5 concurrent getToken calls
        const results = await Promise.all([
          auth.getToken(),
          auth.getToken(),
          auth.getToken(),
          auth.getToken(),
          auth.getToken(),
        ]);

        assert.strictEqual(loginCallCount, 1, "Login should have been called exactly once");
        for (const res of results) {
          assert.strictEqual(res, "concurrent_token_xyz");
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("refreshes token after invalidation", async () => {
      process.env.SHIPROCKET_API_EMAIL = "ops@niyat.in";
      process.env.SHIPROCKET_API_PASSWORD = "secret_password_123";

      let loginCallCount = 0;
      const mockFetch: typeof fetch = async () => {
        loginCallCount++;
        return new Response(JSON.stringify({ token: `token_v${loginCallCount}` }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        const auth = ShiprocketAuthManager.getInstance();
        const t1 = await auth.getToken();
        assert.strictEqual(t1, "token_v1");

        auth.invalidateToken();

        const t2 = await auth.getToken();
        assert.strictEqual(t2, "token_v2");
        assert.strictEqual(loginCallCount, 2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("HTTP Error Classification", () => {
    test("classifies 401 as ShiprocketAuthError (unretryable)", () => {
      const err = classifyShiprocketHttpError(401, { message: "Invalid credentials" }, "/orders");
      assert.ok(err instanceof ShiprocketAuthError);
      assert.strictEqual(err.statusCode, 401);
      assert.strictEqual(err.isRetryable, false);
      assert.strictEqual(err.message, "Invalid credentials");
    });

    test("classifies 400 and 422 as ShiprocketValidationError (unretryable)", () => {
      const err400 = classifyShiprocketHttpError(400, { message: "Invalid payload" }, "/orders");
      assert.ok(err400 instanceof ShiprocketValidationError);
      assert.strictEqual(err400.isRetryable, false);

      const err422 = classifyShiprocketHttpError(422, { message: "Unprocessable address" }, "/orders");
      assert.ok(err422 instanceof ShiprocketValidationError);
      assert.strictEqual(err422.isRetryable, false);
    });

    test("classifies 429 as ShiprocketRateLimitError (retryable) with Retry-After header", () => {
      const headers = new Headers({ "retry-after": "12" });
      const err = classifyShiprocketHttpError(429, { message: "Too many requests" }, "/orders", headers);
      assert.ok(err instanceof ShiprocketRateLimitError);
      assert.strictEqual(err.statusCode, 429);
      assert.strictEqual(err.isRetryable, true);
      assert.strictEqual(err.retryAfterSeconds, 12);
    });

    test("classifies 500, 502, 503, 504 as ShiprocketServerError (retryable)", () => {
      for (const code of [500, 502, 503, 504]) {
        const err = classifyShiprocketHttpError(code, { message: "Server error" }, "/orders");
        assert.ok(err instanceof ShiprocketServerError);
        assert.strictEqual(err.statusCode, code);
        assert.strictEqual(err.isRetryable, true);
      }
    });
  });

  describe("Sanitization & Masking", () => {
    test("maskString masks text properly", () => {
      assert.strictEqual(maskString("mySecretPassword123", 4), "mySe...***");
      assert.strictEqual(maskString("abc", 4), "***");
      assert.strictEqual(maskString("", 4), "");
    });

    test("sanitizeHeaders masks authorization, x-api-key, and secrets", () => {
      const headers = {
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        "x-api-key": "secret_api_key_value",
        "Content-Type": "application/json",
      };

      const sanitized = sanitizeHeaders(headers);
      assert.strictEqual(sanitized["Content-Type"], "application/json");
      assert.ok(!sanitized.Authorization.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
      assert.ok(sanitized.Authorization.includes("...***"));
      assert.ok(!sanitized["x-api-key"].includes("secret_api_key_value"));
    });

    test("sanitizePayload masks sensitive fields recursively", () => {
      const payload = {
        email: "user@example.com",
        password: "superSecretPassword!",
        nested: {
          token: "jwt_token_1234567890",
          shippingAddress: {
            city: "Mumbai",
            pin: "400001",
          },
        },
      };

      const sanitized = sanitizePayload(payload) as Record<string, unknown>;
      assert.strictEqual((sanitized.nested as Record<string, unknown>).token, "jw...***");
      assert.strictEqual(sanitized.password, "su...***");
      assert.deepStrictEqual((sanitized.nested as Record<string, unknown>).shippingAddress, {
        city: "Mumbai",
        pin: "400001",
      });
    });
  });

  describe("ShiprocketClient Request & Retry Execution", () => {
    test("executes successful GET request with Bearer token", async () => {
      process.env.SHIPROCKET_API_EMAIL = "ops@niyat.in";
      process.env.SHIPROCKET_API_PASSWORD = "secret_password_123";

      let capturedAuthHeader: string | null = null;
      const mockFetch: typeof fetch = async (url, init) => {
        if (String(url).includes("/auth/login")) {
          return new Response(JSON.stringify({ token: "test_jwt_client" }), { status: 200 });
        }
        if (String(url).includes("/orders/show/101")) {
          capturedAuthHeader = (init?.headers as Record<string, string>)?.Authorization || null;
          return new Response(JSON.stringify({ order_id: 101, status: "NEW" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not found", { status: 404 });
      };

      const auth = new ShiprocketAuthManager();
      auth.setFetchFnForTesting(mockFetch);
      const client = new ShiprocketClient({ authManager: auth, fetchFn: mockFetch });
      const data = await client.get<{ order_id: number; status: string }>("/orders/show/101");

      assert.strictEqual(data.order_id, 101);
      assert.strictEqual(data.status, "NEW");
      assert.strictEqual(capturedAuthHeader, "Bearer test_jwt_client");
    });

    test("does not retry POST mutations on 500 by default (allowRetry: false)", async () => {
      process.env.SHIPROCKET_API_EMAIL = "ops@niyat.in";
      process.env.SHIPROCKET_API_PASSWORD = "secret_password_123";

      let postAttempts = 0;
      const mockFetch: typeof fetch = async (url) => {
        if (String(url).includes("/auth/login")) {
          return new Response(JSON.stringify({ token: "test_jwt_client" }), { status: 200 });
        }
        if (String(url).includes("/orders/create/adhoc")) {
          postAttempts++;
          return new Response(JSON.stringify({ message: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not found", { status: 404 });
      };

      const auth = new ShiprocketAuthManager();
      auth.setFetchFnForTesting(mockFetch);
      const client = new ShiprocketClient({ authManager: auth, fetchFn: mockFetch });

      await assert.rejects(
        async () => {
          await client.post("/orders/create/adhoc", { order_id: "NIY-123" });
        },
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketServerError);
          assert.strictEqual(err.statusCode, 500);
          return true;
        }
      );

      assert.strictEqual(postAttempts, 1, "Mutating POST should NOT retry on 500 by default to prevent duplicate orders");
    });

    test("handles request timeout via AbortController", async () => {
      process.env.SHIPROCKET_API_EMAIL = "ops@niyat.in";
      process.env.SHIPROCKET_API_PASSWORD = "secret_password_123";

      const mockFetch: typeof fetch = async (url, init) => {
        if (String(url).includes("/auth/login")) {
          return new Response(JSON.stringify({ token: "test_jwt_client" }), { status: 200 });
        }
        // Simulate a hang that respects signal
        return new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      };

      const auth = new ShiprocketAuthManager();
      auth.setFetchFnForTesting(mockFetch);
      const client = new ShiprocketClient({ authManager: auth, fetchFn: mockFetch });

      await assert.rejects(
        async () => {
          await client.get("/orders/show/101", { timeoutMs: 50, allowRetry: false });
        },
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketTimeoutError);
          assert.match(err.message, /timed out/i);
          return true;
        }
      );
    });

    test("refreshes token and retries once on 401 Unauthorized", async () => {
      process.env.SHIPROCKET_API_EMAIL = "ops@niyat.in";
      process.env.SHIPROCKET_API_PASSWORD = "secret_password_123";

      let loginCalls = 0;
      let orderCalls = 0;

      const mockFetch: typeof fetch = async (url) => {
        if (String(url).includes("/auth/login")) {
          loginCalls++;
          return new Response(JSON.stringify({ token: `token_${loginCalls}` }), { status: 200 });
        }
        if (String(url).includes("/orders/show/101")) {
          orderCalls++;
          if (orderCalls === 1) {
            // Expired token response
            return new Response(JSON.stringify({ message: "Token has expired" }), { status: 401 });
          }
          // Second attempt with fresh token succeeds
          return new Response(JSON.stringify({ order_id: 101, status: "OK" }), { status: 200 });
        }
        return new Response("Not found", { status: 404 });
      };

      const auth = new ShiprocketAuthManager();
      auth.setFetchFnForTesting(mockFetch);
      const client = new ShiprocketClient({ authManager: auth, fetchFn: mockFetch });
      const data = await client.get<{ order_id: number; status: string }>("/orders/show/101");

      assert.strictEqual(data.status, "OK");
      assert.strictEqual(loginCalls, 2, "Should have requested a fresh token after 401");
      assert.strictEqual(orderCalls, 2, "Should have retried the query after token refresh");
    });
  });
});

