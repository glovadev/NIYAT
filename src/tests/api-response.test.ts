import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { apiSuccess, apiError, generateRequestId } from "../lib/api/response";

describe("API Response Utilities Unit Tests", () => {
  describe("generateRequestId()", () => {
    test("generates unique request IDs starting with req_ prefix", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      assert.match(id1, /^req_[a-z0-9]+_\d+$/);
      assert.match(id2, /^req_[a-z0-9]+_\d+$/);
      assert.notStrictEqual(id1, id2);
    });
  });

  describe("apiSuccess()", () => {
    test("returns standard successful response structure with status 200", async () => {
      const payload = { id: "prod_123", name: "Aloe Vera Face Wash" };
      const response = apiSuccess(payload);
      assert.strictEqual(response.status, 200);

      const json = await response.json();
      assert.strictEqual(json.success, true);
      assert.deepStrictEqual(json.data, payload);
      assert.ok(json.meta?.requestId);
    });

    test("supports custom status code and custom meta", async () => {
      const payload = { created: true };
      const meta = { pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
      const response = apiSuccess(payload, meta, 201);
      assert.strictEqual(response.status, 201);

      const json = await response.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.meta.pagination.totalItems, 1);
    });
  });

  describe("apiError()", () => {
    test("returns structured error response with status 400 by default", async () => {
      const response = apiError("BAD_REQUEST", "Invalid parameters provided");
      assert.strictEqual(response.status, 400);

      const json = await response.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "BAD_REQUEST");
      assert.strictEqual(json.error.message, "Invalid parameters provided");
      assert.ok(json.error.requestId);
    });

    test("supports custom error status, details array, and requestId", async () => {
      const details = [{ field: "email", issue: "Invalid email format" }];
      const response = apiError("VALIDATION_ERROR", "Validation failed", 422, details, "custom_req_123");
      assert.strictEqual(response.status, 422);

      const json = await response.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "VALIDATION_ERROR");
      assert.strictEqual(json.error.details.length, 1);
      assert.strictEqual(json.error.details[0].field, "email");
      assert.strictEqual(json.error.requestId, "custom_req_123");
    });
  });
});
