import { test, describe, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { getApps, deleteApp } from "firebase-admin/app";
import { serverEnv } from "../lib/config/env";
import { verifyIdToken, getAdminAuth } from "../lib/firebase/admin";
import { requireAdmin } from "../lib/auth/admin-guard";
import { POST as adminLoginHandler } from "../app/api/auth/admin-login/route";
import { POST as uploadHandler } from "../app/api/admin/upload/route";
import { UserProfile } from "../models/UserProfile";

function makeNextRequest(url: string, init?: RequestInit): any {
  const req = new globalThis.Request(url, init);
  (req as any).cookies = {
    get: (name: string) => undefined,
  };
  return req;
}

describe("Production Authentication Security Verification Tests", () => {
  const originalEnv = { ...process.env };
  const TEST_PROJECT_ID = "niyat-29baf";
  const TEST_JWT_SECRET = "test_super_secret_jwt_key_1234567890_32chars!";
  let originalFindOne: any;
  let originalFindById: any;
  let authInstance: any;
  let originalVerifyIdToken: any;

  beforeEach(() => {
    (process.env as any).NODE_ENV = "production";
    process.env.FIREBASE_PROJECT_ID = TEST_PROJECT_ID;
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/niyat_test";
    // Mock mongoose connection cache to avoid network calls
    (global as any).mongooseCache = {
      conn: { connection: { readyState: 1 } } as any,
      promise: null,
    };
    originalFindOne = UserProfile.findOne;
    originalFindById = UserProfile.findById;

    authInstance = getAdminAuth();
    if (authInstance && !originalVerifyIdToken) {
      originalVerifyIdToken = authInstance.verifyIdToken;
    }
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    UserProfile.findOne = originalFindOne;
    UserProfile.findById = originalFindById;

    if (authInstance && originalVerifyIdToken) {
      authInstance.verifyIdToken = originalVerifyIdToken;
    }
  });

  after(async () => {
    for (const app of getApps()) {
      try {
        await deleteApp(app);
      } catch (_) {}
    }

    try {
      await mongoose.disconnect();
    } catch (_) {}

    const handles = (process as any)._getActiveHandles?.() || [];
    for (const handle of handles) {
      if (typeof handle?.unref === "function") {
        handle.unref();
      }
    }
  });

  describe("1. Cryptographic Firebase Token Verification & Forged Token Rejection", () => {
    test("legitimate Firebase ID token is accepted through the Admin SDK path", async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const validDecodedToken = {
        uid: "legit_user_uid_123",
        email: "legit_user@example.com",
        email_verified: true,
        name: "Legit User",
        iss: `https://securetoken.google.com/${TEST_PROJECT_ID}`,
        aud: TEST_PROJECT_ID,
        auth_time: nowSec,
        user_id: "legit_user_uid_123",
        sub: "legit_user_uid_123",
        iat: nowSec,
        exp: nowSec + 3600,
        firebase: { identities: {}, sign_in_provider: "google.com" },
      };

      authInstance.verifyIdToken = async (token: string) => {
        if (token === "valid_production_firebase_id_token") {
          return validDecodedToken;
        }
        throw new Error("Invalid token");
      };

      const result = await verifyIdToken("valid_production_firebase_id_token");
      assert.deepStrictEqual(
        result,
        validDecodedToken,
        "Legitimate Firebase ID token must be accepted through Admin SDK path"
      );
    });

    test("Admin SDK path rejects forged token with invalid cryptographic signature", async () => {
      authInstance.verifyIdToken = async () => {
        const err: any = new Error("Firebase ID token has invalid signature.");
        err.code = "auth/invalid-id-token";
        throw err;
      };

      const result = await verifyIdToken("forged_signature_token");
      assert.strictEqual(
        result,
        null,
        "Forged token with invalid signature must fail closed and return null"
      );
    });

    test("Admin SDK path rejects expired Firebase ID token", async () => {
      authInstance.verifyIdToken = async () => {
        const err: any = new Error("Firebase ID token has expired.");
        err.code = "auth/id-token-expired";
        throw err;
      };

      const result = await verifyIdToken("expired_firebase_token");
      assert.strictEqual(
        result,
        null,
        "Expired Firebase token must fail closed and return null"
      );
    });

    test("Admin SDK path rejects token issued for wrong Firebase project ID (audience mismatch)", async () => {
      authInstance.verifyIdToken = async () => {
        const err: any = new Error("Firebase ID token has incorrect aud claim.");
        err.code = "auth/argument-error";
        throw err;
      };

      const result = await verifyIdToken("foreign_project_token");
      assert.strictEqual(
        result,
        null,
        "Wrong project token must fail closed and return null"
      );
    });

    test("rejects token claims with missing or non-finite exp, iat, or auth_time", async () => {
      authInstance.verifyIdToken = async () => ({
        uid: "some_uid",
        email: "user@example.com",
        exp: "not-a-number", // Non-finite!
        iat: NaN,
        auth_time: undefined,
      });

      const result = await verifyIdToken("token_with_non_finite_claims");
      assert.strictEqual(
        result,
        null,
        "Token with non-finite exp/iat must be rejected"
      );
    });

    test("rejects empty, whitespace, or malformed strings", async () => {
      assert.strictEqual(await verifyIdToken(""), null);
      assert.strictEqual(await verifyIdToken("   "), null);
      assert.strictEqual(await verifyIdToken("not.a.valid.jwt.string"), null);
      assert.strictEqual(await verifyIdToken("randomstring123"), null);
    });
  });

  describe("2. Admin Password Enforcement & Hardcoded Default Removal", () => {
    test("fails securely when ADMIN_PASSWORD is not set (undefined)", async () => {
      delete process.env.ADMIN_PASSWORD;

      const req = makeNextRequest("http://localhost:3000/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@niyat.com",
          password: "Niyat@2026!", // previously hardcoded password
        }),
      });

      const res = await adminLoginHandler(req);
      const json = await res.json();

      assert.strictEqual(res.status, 500, "Must return HTTP 500 when ADMIN_PASSWORD is missing");
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "AUTH_UNAVAILABLE");
      assert.ok(!json.data?.token, "No token must be issued when ADMIN_PASSWORD is unset");
    });

    test("fails securely when ADMIN_PASSWORD is empty or whitespace", async () => {
      process.env.ADMIN_PASSWORD = "    ";

      const req = makeNextRequest("http://localhost:3000/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@niyat.com",
          password: "anypassword",
        }),
      });

      const res = await adminLoginHandler(req);
      const json = await res.json();

      assert.strictEqual(res.status, 500, "Must return HTTP 500 when ADMIN_PASSWORD is empty string");
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "AUTH_UNAVAILABLE");
    });

    test("rejects the old hardcoded password 'Niyat@2026!' when ADMIN_PASSWORD is set to a new secret", async () => {
      process.env.ADMIN_PASSWORD = "ProductionSecretAdminKey@999!";

      UserProfile.findOne = (async () => ({
        _id: "admin_doc_id",
        firebaseUid: "admin_uid_001",
        email: "admin@niyat.com",
        name: "Admin",
        role: "ADMIN",
        status: "ACTIVE",
        save: async () => {},
      })) as any;

      const req = makeNextRequest("http://localhost:3000/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@niyat.com",
          password: "Niyat@2026!", // Old hardcoded default should NOT work
        }),
      });

      const res = await adminLoginHandler(req);
      const json = await res.json();

      assert.strictEqual(res.status, 401, "Must return HTTP 401 for incorrect password");
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "UNAUTHORIZED");
    });

    test("successfully logs in when correct configured ADMIN_PASSWORD is provided", async () => {
      const correctSecret = "SuperSecureProductionAdminPass2026#$";
      process.env.ADMIN_PASSWORD = correctSecret;

      UserProfile.findOne = (async () => ({
        _id: "admin_doc_id_123",
        firebaseUid: "admin_uid_123",
        email: "admin@niyat.com",
        name: "Store Administrator",
        role: "ADMIN",
        status: "ACTIVE",
        save: async () => {},
      })) as any;

      const req = makeNextRequest("http://localhost:3000/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@niyat.com",
          password: correctSecret,
        }),
      });

      const res = await adminLoginHandler(req);
      const json = await res.json();

      assert.strictEqual(res.status, 200, "Must return HTTP 200 for valid credentials");
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.profile.role, "ADMIN");
      assert.ok(json.data.token, "Must return signed JWT session token");

      // Verify the returned token is cryptographically signed with server JWT_SECRET
      const decodedToken = jwt.verify(json.data.token, serverEnv.JWT_SECRET) as any;
      assert.strictEqual(decodedToken.email, "admin@niyat.com");
      assert.strictEqual(decodedToken.role, "ADMIN");
    });
  });

  describe("3. Administrator Role Protection & Authorization Boundaries", () => {
    test("rejects login attempt from unauthorized non-admin email", async () => {
      process.env.ADMIN_PASSWORD = "ValidAdminPassword123!";

      UserProfile.findOne = (async () => null) as any;

      const req = makeNextRequest("http://localhost:3000/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "random_attacker@external.com",
          password: "ValidAdminPassword123!",
        }),
      });

      const res = await adminLoginHandler(req);
      const json = await res.json();

      assert.strictEqual(res.status, 401, "Unauthorized email must be rejected with 401");
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "UNAUTHORIZED");
    });

    test("requireAdmin rejects unauthenticated request without session", async () => {
      const req = makeNextRequest("http://localhost:3000/api/admin/orders");
      const check = await requireAdmin(req, "STAFF");

      assert.strictEqual(check.authorized, false);
      assert.ok(check.response);
      assert.strictEqual(check.response.status, 401);
    });

    test("requireAdmin rejects request with forged authorization bearer token", async () => {
      const fakeToken = jwt.sign(
        { uid: "spoofed_admin", email: "admin@niyat.com", role: "ADMIN" },
        "wrong_jwt_secret"
      );

      const req = makeNextRequest("http://localhost:3000/api/admin/orders", {
        headers: {
          Authorization: `Bearer ${fakeToken}`,
        },
      });

      const check = await requireAdmin(req, "ADMIN");
      assert.strictEqual(check.authorized, false);
      assert.strictEqual(check.response?.status, 401);
    });

    test("customer user profile cannot perform administrative operations", async () => {
      const mockCustomerDoc = {
        _id: "customer_id_999",
        firebaseUid: "customer_uid_999",
        name: "Regular Customer",
        email: "customer@example.com",
        role: "CUSTOMER",
        status: "ACTIVE",
        save: async () => {},
      };

      // Mock UserProfile to return customer role
      UserProfile.findOne = (async () => mockCustomerDoc) as any;
      UserProfile.findById = (async () => mockCustomerDoc) as any;

      // Token is cryptographically signed with server JWT_SECRET, but belongs to a CUSTOMER
      const customerToken = jwt.sign(
        {
          uid: "customer_uid_999",
          profileId: "customer_id_999",
          email: "customer@example.com",
          name: "Regular Customer",
          role: "CUSTOMER",
        },
        serverEnv.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const req = makeNextRequest("http://localhost:3000/api/admin/products", {
        headers: {
          Authorization: `Bearer ${customerToken}`,
        },
      });

      const check = await requireAdmin(req, "STAFF");
      assert.strictEqual(
        check.authorized,
        false,
        "Customer profile must NOT be authorized for staff/admin endpoints"
      );
      assert.strictEqual(check.response?.status, 403, "Must return HTTP 403 Forbidden");
    });

    test("reloads role from MongoDB and rejects access if token claims role: ADMIN but MongoDB record is CUSTOMER", async () => {
      // Attacker managed to obtain or forge a token claiming role: 'ADMIN'
      const tokenWithSpoofedClaim = jwt.sign(
        {
          uid: "tampered_uid_777",
          profileId: "tampered_doc_777",
          email: "customer@example.com",
          name: "Privilege Escalation Attacker",
          role: "ADMIN", // Spoofed claim in token!
        },
        serverEnv.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // But in the MongoDB database, the actual user role is CUSTOMER
      const realMongoCustomerDoc = {
        _id: "tampered_doc_777",
        firebaseUid: "tampered_uid_777",
        name: "Privilege Escalation Attacker",
        email: "customer@example.com",
        role: "CUSTOMER", // Real role in database
        status: "ACTIVE",
        save: async () => {},
      };

      UserProfile.findOne = (async () => realMongoCustomerDoc) as any;
      UserProfile.findById = (async () => realMongoCustomerDoc) as any;

      const req = makeNextRequest("http://localhost:3000/api/admin/orders", {
        headers: {
          Authorization: `Bearer ${tokenWithSpoofedClaim}`,
        },
      });

      const check = await requireAdmin(req, "STAFF");
      assert.strictEqual(
        check.authorized,
        false,
        "Must verify role against MongoDB record rather than trusting token claims"
      );
      assert.strictEqual(check.response?.status, 403, "Must return HTTP 403 Forbidden");
    });

    test("unverified email (email_verified: false) cannot inherit store owner ADMIN role", async () => {
      const mockCustomerOwnerDoc = {
        _id: "customer_owner_doc",
        firebaseUid: "unverified_attacker_uid",
        name: "Unverified Impersonator",
        email: "admin@niyat.com", // Claims owner email!
        role: "CUSTOMER", // But currently customer
        status: "ACTIVE",
        save: async () => {},
      };

      UserProfile.findOne = (async () => mockCustomerOwnerDoc) as any;
      UserProfile.findById = (async () => mockCustomerOwnerDoc) as any;

      // Token has email_verified: false!
      const unverifiedOwnerToken = jwt.sign(
        {
          uid: "unverified_attacker_uid",
          profileId: "customer_owner_doc",
          email: "admin@niyat.com",
          email_verified: false, // NOT VERIFIED!
          name: "Unverified Impersonator",
          role: "CUSTOMER",
        },
        serverEnv.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const req = makeNextRequest("http://localhost:3000/api/admin/banners", {
        headers: {
          Authorization: `Bearer ${unverifiedOwnerToken}`,
        },
      });

      const check = await requireAdmin(req, "ADMIN");
      assert.strictEqual(
        check.authorized,
        false,
        "Unverified email must NEVER be promoted to ADMIN role"
      );
      assert.strictEqual(check.response?.status, 403, "Must return HTTP 403 Forbidden");
    });
  });

  describe("4. Admin Upload Authorization & Privilege Enforcement", () => {
    test("POST /api/admin/upload rejects unauthenticated upload with HTTP 401", async () => {
      const req = makeNextRequest("http://localhost:3000/api/admin/upload", {
        method: "POST",
      });

      const res = await uploadHandler(req);
      const json = await res.json();

      assert.strictEqual(res.status, 401, "Unauthenticated upload must return 401");
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "UNAUTHENTICATED");
    });

    test("POST /api/admin/upload rejects forged bearer token with HTTP 401", async () => {
      const fakeToken = jwt.sign(
        { uid: "spoofed_admin", email: "admin@niyat.com", role: "ADMIN" },
        "wrong_jwt_secret"
      );

      const req = makeNextRequest("http://localhost:3000/api/admin/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fakeToken}`,
        },
      });

      const res = await uploadHandler(req);
      const json = await res.json();

      assert.strictEqual(res.status, 401, "Forged token upload must return 401");
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "UNAUTHENTICATED");
    });

    test("POST /api/admin/upload rejects non-staff customer role with HTTP 403", async () => {
      const mockCustomerDoc = {
        _id: "customer_id_888",
        firebaseUid: "customer_uid_888",
        name: "Regular Customer",
        email: "customer@example.com",
        role: "CUSTOMER",
        status: "ACTIVE",
        save: async () => {},
      };

      UserProfile.findOne = (async () => mockCustomerDoc) as any;
      UserProfile.findById = (async () => mockCustomerDoc) as any;

      const customerToken = jwt.sign(
        {
          uid: "customer_uid_888",
          profileId: "customer_id_888",
          email: "customer@example.com",
          name: "Regular Customer",
          role: "CUSTOMER",
        },
        serverEnv.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const req = makeNextRequest("http://localhost:3000/api/admin/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${customerToken}`,
        },
      });

      const res = await uploadHandler(req);
      const json = await res.json();

      assert.strictEqual(res.status, 403, "Customer role upload must return 403");
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "FORBIDDEN");
    });
  });
});
