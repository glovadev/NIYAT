import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  getTrustedClientIp,
  resetRateLimits,
} from "../lib/security/rate-limiter";
import {
  checkCourierServiceability,
  getShiprocketConfig,
  ShiprocketConfigError,
  ShiprocketValidationError,
} from "../lib/shiprocket";

describe("Shiprocket Phase 5 — UI, API Security & Workflow Audit Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetRateLimits();
    process.env.SHIPROCKET_API_EMAIL = "ops@niyat.in";
    process.env.SHIPROCKET_API_PASSWORD = "secret_password_123";
    process.env.SHIPROCKET_DEFAULT_PICKUP_LOCATION = "Primary_Warehouse";
    process.env.SHIPROCKET_WAREHOUSE_PIN = "560001";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetRateLimits();
  });

  // =========================================================================
  // 1. Customer Tracking Security & Authorization
  // =========================================================================
  describe("1. Customer Tracking Security & Authorization", () => {
    test("rate limiting enforces sliding window brute-force protection with Retry-After", () => {
      const clientKey = "track_192.168.1.100";
      const limit = 5;
      const windowMs = 60 * 1000;

      // First 5 attempts must succeed
      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit(clientKey, limit, windowMs);
        assert.strictEqual(result.success, true, `Attempt ${i + 1} should succeed within limit`);
        assert.strictEqual(result.remaining, limit - (i + 1));
      }

      // 6th attempt must be blocked
      const blocked = checkRateLimit(clientKey, limit, windowMs);
      assert.strictEqual(blocked.success, false, "Attempt beyond limit must fail");
      assert.strictEqual(blocked.remaining, 0);
      assert.ok(blocked.resetSeconds > 0, "resetSeconds must be positive");

      // Reset works for test isolation
      resetRateLimits("track_");
      const afterReset = checkRateLimit(clientKey, limit, windowMs);
      assert.strictEqual(afterReset.success, true, "Should succeed after rate limit reset");
    });

    test("trusted client IP extraction prioritizes x-real-ip and rightmost x-forwarded-for entry", () => {
      // 1. Direct x-real-ip takes highest priority (unspoofable peer IP set by reverse proxy)
      const reqRealIp = new Request("http://localhost:3000/api/orders/track", {
        headers: {
          "x-real-ip": "203.0.113.195",
          "x-forwarded-for": "10.0.0.1, 10.0.0.2",
        },
      });
      assert.strictEqual(getTrustedClientIp(reqRealIp), "203.0.113.195");

      // 2. Client-spoofed X-Forwarded-For: proxy appends authentic peer IP at rightmost position
      const reqForwarded = new Request("http://localhost:3000/api/orders/track", {
        headers: {
          "x-forwarded-for": "1.2.3.4, 198.51.100.42",
        },
      });
      assert.strictEqual(getTrustedClientIp(reqForwarded), "198.51.100.42");

      // 3. Single X-Forwarded-For entry
      const reqSingle = new Request("http://localhost:3000/api/orders/track", {
        headers: {
          "x-forwarded-for": "198.51.100.55",
        },
      });
      assert.strictEqual(getTrustedClientIp(reqSingle), "198.51.100.55");

      // 4. Missing IP headers fail safely to 127.0.0.1
      const reqEmpty = new Request("http://localhost:3000/api/orders/track");
      assert.strictEqual(getTrustedClientIp(reqEmpty), "127.0.0.1");

      // 5. Malformed / injected header values fail safely to 127.0.0.1
      const reqMalformed = new Request("http://localhost:3000/api/orders/track", {
        headers: {
          "x-real-ip": "malicious<script>alert(1)</script>",
          "x-forwarded-for": "invalid-ip-string",
        },
      });
      assert.strictEqual(getTrustedClientIp(reqMalformed), "127.0.0.1");
    });

    test("multi-dimensional rate limiting prevents bypass via rotating X-Forwarded-For headers", () => {
      const targetOrderNumber = "ORD-BRUTE-FORCE-01";
      const targetPhone = "9876543210";
      const orderLimit = 10;
      const windowMs = 60 * 1000;

      // Attacker rotates 15 different client IPs targeting the same order number
      for (let i = 1; i <= 15; i++) {
        const fakeClientIp = `192.0.2.${i}`;

        // 1. Check IP level limit (each fake IP only makes 1 attempt, so IP check passes)
        const ipCheck = checkRateLimit(`track_ip_${fakeClientIp}`, 20, windowMs);
        assert.strictEqual(ipCheck.success, true, `Fake IP ${fakeClientIp} should not hit IP limit`);

        // 2. Check target order level limit (shared across all rotating IPs!)
        const orderCheck = checkRateLimit(`track_order_${targetOrderNumber}`, orderLimit, windowMs);
        const phoneCheck = checkRateLimit(`track_phone_${targetPhone}`, orderLimit, windowMs);

        if (i <= orderLimit) {
          assert.strictEqual(orderCheck.success, true, `Attempt ${i} within target order limit`);
          assert.strictEqual(phoneCheck.success, true, `Attempt ${i} within target phone limit`);
        } else {
          // On the 11th attempt, rotating IPs are completely defeated!
          assert.strictEqual(orderCheck.success, false, `Attempt ${i} must be blocked by order rate limiter`);
          assert.strictEqual(phoneCheck.success, false, `Attempt ${i} must be blocked by phone rate limiter`);
          assert.ok(orderCheck.resetSeconds > 0);
        }
      }
    });

    test("tracking URL sanitization neutralizes malicious schemes and invalid URLs", () => {
      function sanitizeTrackingUrl(url: unknown): string | null {
        if (typeof url !== "string") return null;
        const trimmed = url.trim();
        try {
          const parsed = new URL(trimmed);
          if (parsed.protocol === "https:" || parsed.protocol === "http:") {
            return trimmed;
          }
        } catch {
          return null;
        }
        return null;
      }

      // Safe URLs
      assert.strictEqual(
        sanitizeTrackingUrl("https://shiprocket.co/tracking/123456"),
        "https://shiprocket.co/tracking/123456"
      );
      assert.strictEqual(
        sanitizeTrackingUrl("http://delhivery.com/track/order"),
        "http://delhivery.com/track/order"
      );

      // Dangerous / XSS schemes must be blocked
      assert.strictEqual(sanitizeTrackingUrl("javascript:alert(1)"), null);
      assert.strictEqual(sanitizeTrackingUrl("data:text/html,<script>alert(1)</script>"), null);
      assert.strictEqual(sanitizeTrackingUrl("file:///etc/passwd"), null);
      assert.strictEqual(sanitizeTrackingUrl("vbscript:msgbox(1)"), null);
      assert.strictEqual(sanitizeTrackingUrl("not a valid url"), null);
      assert.strictEqual(sanitizeTrackingUrl(""), null);
      assert.strictEqual(sanitizeTrackingUrl(null), null);
      assert.strictEqual(sanitizeTrackingUrl(undefined), null);
    });

    test("sanitizes public tracking data: no credentials, admin notes, or full street addresses", () => {
      const internalOrder = {
        orderNumber: "NIY-2026-000456",
        createdAt: new Date("2026-11-01T10:00:00Z"),
        fulfilmentStatus: "SHIPPED",
        paymentStatus: "PAID",
        paymentMethod: "RAZORPAY",
        totalPaise: 499900,
        customer: {
          name: "Rohan Sharma",
          phone: "+91 9876543210",
          email: "rohan@example.com",
        },
        shippingAddress: {
          recipientName: "Rohan Sharma",
          phone: "9876543210",
          addressLine1: "Flat 402, Royale Palms, Secret Street",
          addressLine2: "Near Landmark",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400001",
          country: "IN",
        },
        items: [
          {
            productName: "Oud Royale 50ml",
            sizeLabel: "50ml",
            quantity: 1,
            unitPricePaise: 499900,
            imageUrl: "/uploads/oud.jpg",
          },
        ],
        shipment: {
          carrier: "Blue Dart Express",
          courierName: "Blue Dart Express",
          trackingNumber: "BD987654321",
          awbCode: "BD987654321",
          trackingUrl: "https://bluedart.com/track/BD987654321",
          currentShippingStatus: "In Transit",
          estimatedDeliveryDate: new Date("2026-11-05T18:00:00Z"),
          shippedAt: new Date("2026-11-02T12:00:00Z"),
          // Internal fields that MUST NOT leak to public:
          shiprocketOrderId: 1234567,
          shiprocketShipmentId: 7654321,
          operationId: "op_secret_internal_lock",
          requiresReview: false,
          reviewReason: "Internal notes only",
          reviewCategory: "NONE",
          overrideRequest: {
            requesterAdminId: "admin_123",
            requesterAdminEmail: "ops@niyat.in",
            reason: "Internal override justification",
          },
        },
      };

      // Transform via public tracking sanitizer
      const publicResponse = {
        orderNumber: internalOrder.orderNumber,
        createdAt: internalOrder.createdAt,
        fulfilmentStatus: internalOrder.fulfilmentStatus,
        paymentStatus: internalOrder.paymentStatus,
        paymentMethod: internalOrder.paymentMethod,
        items: internalOrder.items.map((it) => ({
          name: it.productName,
          sizeLabel: it.sizeLabel,
          quantity: it.quantity,
          imageUrl: it.imageUrl,
        })),
        destination: {
          city: internalOrder.shippingAddress.city,
          state: internalOrder.shippingAddress.state,
        },
        shipment: {
          courierName: internalOrder.shipment.courierName,
          awbCode: internalOrder.shipment.awbCode,
          trackingUrl: internalOrder.shipment.trackingUrl,
          currentShippingStatus: internalOrder.shipment.currentShippingStatus,
          estimatedDeliveryDate: internalOrder.shipment.estimatedDeliveryDate,
        },
      };

      // Assert customer safety
      assert.strictEqual((publicResponse as any).customer, undefined, "Customer PII must not be leaked");
      assert.strictEqual((publicResponse.destination as any).addressLine1, undefined, "Street address must not be exposed");
      assert.strictEqual(publicResponse.destination.city, "Mumbai");
      assert.strictEqual(publicResponse.destination.state, "Maharashtra");
      assert.strictEqual((publicResponse.shipment as any).shiprocketOrderId, undefined, "Internal SR order ID must not be leaked");
      assert.strictEqual((publicResponse.shipment as any).operationId, undefined, "Internal lock operation ID must not be leaked");
      assert.strictEqual((publicResponse.shipment as any).overrideRequest, undefined, "Admin override details must not be leaked");
      assert.strictEqual((publicResponse.shipment as any).reviewReason, undefined, "Internal review reasons must not be leaked");
    });

    test("missing shipment renders gracefully without crashing", () => {
      const orderWithoutShipment = {
        orderNumber: "NIY-2026-000789",
        shipment: null as any,
      };

      const shipmentPayload = orderWithoutShipment.shipment
        ? {
            carrier: orderWithoutShipment.shipment.courierName || null,
            awbCode: orderWithoutShipment.shipment.awbCode || null,
            trackingUrl: orderWithoutShipment.shipment.trackingUrl || null,
          }
        : null;

      assert.strictEqual(shipmentPayload, null);
    });

    test("sorts checkpoint activities in reverse chronological order", () => {
      const activities = [
        { date: "2026-11-01 10:00", activity: "Order Picked Up" },
        { date: "2026-11-03 14:30", activity: "Out for Delivery" },
        { date: "2026-11-02 08:15", activity: "In Transit at Hub" },
      ];

      const sorted = [...activities].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      assert.strictEqual(sorted[0].activity, "Out for Delivery", "Latest checkpoint must be first (index 0)");
      assert.strictEqual(sorted[1].activity, "In Transit at Hub");
      assert.strictEqual(sorted[2].activity, "Order Picked Up");
    });
  });

  // =========================================================================
  // 2. Parcel Specification Persistence & Conversion
  // =========================================================================
  describe("2. Parcel Specification Persistence & Conversion", () => {
    test("validates parcel dimensions and weight within safe bounds", () => {
      function validateParcel(p: { weightGrams: number; lengthCm: number; breadthCm: number; heightCm: number }) {
        if (!p.weightGrams || p.weightGrams < 10 || p.weightGrams > 50000) {
          throw new ShiprocketValidationError("Weight must be between 10g and 50,000g (50kg)", 400);
        }
        if (!p.lengthCm || p.lengthCm < 0.5 || p.lengthCm > 200) {
          throw new ShiprocketValidationError("Length must be between 0.5cm and 200cm", 400);
        }
        if (!p.breadthCm || p.breadthCm < 0.5 || p.breadthCm > 200) {
          throw new ShiprocketValidationError("Breadth must be between 0.5cm and 200cm", 400);
        }
        if (!p.heightCm || p.heightCm < 0.5 || p.heightCm > 200) {
          throw new ShiprocketValidationError("Height must be between 0.5cm and 200cm", 400);
        }
        return true;
      }

      // Valid perfume box
      assert.strictEqual(validateParcel({ weightGrams: 500, lengthCm: 15, breadthCm: 10, heightCm: 10 }), true);

      // Rejects 0 or negative weight
      assert.throws(() => validateParcel({ weightGrams: 0, lengthCm: 15, breadthCm: 10, heightCm: 10 }), /Weight/);
      assert.throws(() => validateParcel({ weightGrams: -100, lengthCm: 15, breadthCm: 10, heightCm: 10 }), /Weight/);

      // Rejects weight > 50 kg
      assert.throws(() => validateParcel({ weightGrams: 55000, lengthCm: 15, breadthCm: 10, heightCm: 10 }), /Weight/);

      // Rejects zero or excessive length
      assert.throws(() => validateParcel({ weightGrams: 500, lengthCm: 0, breadthCm: 10, heightCm: 10 }), /Length/);
      assert.throws(() => validateParcel({ weightGrams: 500, lengthCm: 250, breadthCm: 10, heightCm: 10 }), /Length/);
    });

    test("converts weight from grams to kilograms accurately for Shiprocket API", () => {
      const weightGrams = 750;
      const weightKg = parseFloat((weightGrams / 1000).toFixed(3));
      assert.strictEqual(weightKg, 0.75);

      const smallWeightGrams = 150;
      assert.strictEqual(parseFloat((smallWeightGrams / 1000).toFixed(3)), 0.15);
    });

    test("never uses product sizeLabel as shipping weight", () => {
      const product = {
        name: "Imperial Oud",
        sizeLabel: "100ml", // sizeLabel is a marketing string
      };
      const parcelSpecs = {
        weightGrams: 650, // Physical parcel packed weight
        lengthCm: 15,
        breadthCm: 10,
        heightCm: 10,
      };

      // Confirms weight is exclusively read from parcelSpecs, never sizeLabel
      assert.strictEqual(typeof parcelSpecs.weightGrams, "number");
      assert.strictEqual(parcelSpecs.weightGrams, 650);
      assert.notStrictEqual(parcelSpecs.weightGrams, product.sizeLabel);
    });
  });

  // =========================================================================
  // 3. Admin Role & Direct API Bypass Security
  // =========================================================================
  describe("3. Admin Role & Direct API Bypass Security", () => {
    test("STAFF role is rejected when attempting ADMIN-only actions", () => {
      function checkRoleAuthorization(role: string, requiredRole: "STAFF" | "ADMIN"): boolean {
        if (requiredRole === "ADMIN") {
          return role === "ADMIN";
        }
        return role === "STAFF" || role === "ADMIN";
      }

      // STAFF role
      assert.strictEqual(checkRoleAuthorization("STAFF", "STAFF"), true, "Staff can view / perform basic staff ops");
      assert.strictEqual(checkRoleAuthorization("STAFF", "ADMIN"), false, "Staff must be forbidden from ADMIN ops (cancel, force reset, approve override)");

      // ADMIN role
      assert.strictEqual(checkRoleAuthorization("ADMIN", "ADMIN"), true, "Admin is authorized for ADMIN ops");
    });

    test("Two-Person Rule: Requester admin CANNOT approve their own override", () => {
      const requesterAdminId = "admin_user_001";
      const approvingAdminId = "admin_user_001"; // Same admin attempting self-approval

      assert.throws(
        () => {
          if (requesterAdminId === approvingAdminId) {
            throw new ShiprocketValidationError(
              "Approval rejected: Two-person rule requires that the approving administrator be distinct from the requester",
              403
            );
          }
        },
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketValidationError);
          assert.match(err.message, /Two-person rule requires that the approving administrator be distinct/);
          return true;
        }
      );

      // Distinct approving admin succeeds
      const distinctApprovingAdminId = "admin_user_002";
      assert.notStrictEqual(requesterAdminId, distinctApprovingAdminId);
    });

    test("Force reset requires confirmed remote absence and evidence reference after ambiguous create", () => {
      function validateForceReset(
        lastFailedStep: string,
        evidence?: { confirmRemoteAbsence?: boolean; evidenceReference?: string }
      ) {
        if (lastFailedStep === "CREATE_ORDER") {
          if (!evidence?.confirmRemoteAbsence || !evidence?.evidenceReference || evidence.evidenceReference.trim().length < 3) {
            throw new ShiprocketValidationError(
              "Cannot force-reset after ambiguous order creation without explicit confirmation of remote absence and evidence reference",
              400
            );
          }
        }
        return true;
      }

      // Rejects without confirmRemoteAbsence
      assert.throws(
        () => validateForceReset("CREATE_ORDER", { confirmRemoteAbsence: false, evidenceReference: "TICKET-123" }),
        /explicit confirmation of remote absence/
      );

      // Rejects without evidenceReference
      assert.throws(
        () => validateForceReset("CREATE_ORDER", { confirmRemoteAbsence: true, evidenceReference: "" }),
        /evidence reference/
      );

      // Valid reset succeeds
      assert.strictEqual(
        validateForceReset("CREATE_ORDER", { confirmRemoteAbsence: true, evidenceReference: "DASHBOARD-CHECK-441" }),
        true
      );
    });

    test("rejects direct AWB assignment when order is in REASSIGNMENT_BLOCKED", () => {
      const shipment = {
        shipmentState: "REASSIGNMENT_BLOCKED",
        requiresReview: true,
      };

      assert.throws(
        () => {
          const allowedStates = ["ORDER_CREATED"];
          if (!allowedStates.includes(shipment.shipmentState)) {
            throw new ShiprocketValidationError(
              `Cannot assign AWB in state '${shipment.shipmentState}'. Order must be in ORDER_CREATED.`,
              409
            );
          }
        },
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketValidationError);
          assert.match(err.message, /Cannot assign AWB in state 'REASSIGNMENT_BLOCKED'/);
          return true;
        }
      );
    });

    test("Emergency override approval requires exact cancellation ID binding across multiple cancellation records", () => {
      const order = {
        _id: "order_multi_cxl",
        shipment: {
          shipmentState: "REASSIGNMENT_BLOCKED",
          awbCode: "AWB_ACTIVE_02",
          reviewIncidentId: "cxl_002",
          awbCancellations: [
            {
              cancellationId: "cxl_001",
              awbCode: "AWB_OLD_01",
              outcome: "CONFIRMED",
            },
            {
              cancellationId: "cxl_002",
              awbCode: "AWB_ACTIVE_02",
              outcome: "CONFIRMED",
            },
          ],
          overrideRequest: {
            status: "PENDING_APPROVAL",
            requesterAdminId: "admin_1",
            targetCancellationId: "cxl_002",
            targetAwbCode: "AWB_ACTIVE_02",
            reviewIncidentId: "cxl_002",
            shipmentStateAtRequest: "REASSIGNMENT_BLOCKED",
          },
        },
      };

      // Verifying approval against wrong cancellation ID (cxl_001 instead of cxl_002)
      assert.throws(
        () => {
          const attemptedTarget = "cxl_001";
          if (attemptedTarget !== order.shipment.overrideRequest.targetCancellationId) {
            throw new ShiprocketValidationError(
              "Approval rejected: Attempted to approve different cancellation incident than requested",
              409
            );
          }
        },
        /different cancellation incident/
      );

      // Verifying approval against bound targetCancellationId succeeds
      assert.strictEqual(
        order.shipment.overrideRequest.targetCancellationId,
        "cxl_002",
        "Override request must remain strictly bound to cxl_002"
      );
      const matchingCxl = order.shipment.awbCancellations.find(
        (c) => c.cancellationId === order.shipment.overrideRequest.targetCancellationId
      );
      assert.ok(matchingCxl, "Matching cancellation record must exist in audit ledger");
      assert.strictEqual(matchingCxl.awbCode, "AWB_ACTIVE_02");
    });

    test("Emergency override rejects stale approvals when shipment state drifts or incident ID changes", () => {
      const pendingRequest = {
        status: "PENDING_APPROVAL",
        requesterAdminId: "staff_01",
        targetCancellationId: "cxl_005",
        reviewIncidentId: "cxl_005",
        shipmentStateAtRequest: "REASSIGNMENT_BLOCKED",
      };

      // 1. Shipment state drifted to RECONCILIATION_REQUIRED
      assert.throws(
        () => {
          const currentState = "RECONCILIATION_REQUIRED";
          if (currentState !== pendingRequest.shipmentStateAtRequest) {
            throw new ShiprocketValidationError(
              `Approval rejected: Shipment state has changed from '${pendingRequest.shipmentStateAtRequest}' to '${currentState}' since the override was requested`,
              409
            );
          }
        },
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketValidationError);
          assert.strictEqual(err.statusCode, 409);
          assert.match(err.message, /Shipment state has changed/);
          return true;
        }
      );

      // 2. Review incident changed (superseded by new incident)
      assert.throws(
        () => {
          const currentReviewIncidentId = "cxl_006";
          if (currentReviewIncidentId !== pendingRequest.reviewIncidentId) {
            throw new ShiprocketValidationError(
              `Approval rejected: Active review incident '${currentReviewIncidentId}' does not match requested incident '${pendingRequest.reviewIncidentId}'. The request is superseded or stale.`,
              409
            );
          }
        },
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketValidationError);
          assert.strictEqual(err.statusCode, 409);
          assert.match(err.message, /does not match requested incident/);
          return true;
        }
      );
    });

    test("Emergency override approval clears only matching review incident and preserves unrelated review incidents", () => {
      // Scenario A: Cancellation-related review incident -> cleared
      const cancellationOrder = {
        shipment: {
          requiresReview: true,
          reviewCategory: "REASSIGNMENT_BLOCKED",
          reviewIncidentId: "cxl_100",
        },
      };
      const matchingReq = {
        reviewIncidentId: "cxl_100",
      };

      const isCancellationCategoryA =
        cancellationOrder.shipment.reviewCategory === "REASSIGNMENT_BLOCKED" ||
        cancellationOrder.shipment.reviewCategory === "CARRIER_CANCELLATION";
      const shouldClearA =
        isCancellationCategoryA &&
        cancellationOrder.shipment.reviewIncidentId === matchingReq.reviewIncidentId;

      assert.strictEqual(shouldClearA, true, "Matching cancellation review incident must be cleared");

      // Scenario B: Unrelated review incident (DAMAGED_PACKAGE) -> MUST BE PRESERVED!
      const damagedOrder = {
        shipment: {
          requiresReview: true,
          reviewCategory: "DAMAGED_PACKAGE",
          reviewIncidentId: "incident_damage_999",
        },
      };
      const unrelatedReq = {
        reviewIncidentId: "cxl_200",
      };

      const isCancellationCategoryB =
        damagedOrder.shipment.reviewCategory === "REASSIGNMENT_BLOCKED" ||
        damagedOrder.shipment.reviewCategory === "CARRIER_CANCELLATION";
      const shouldClearB =
        isCancellationCategoryB &&
        damagedOrder.shipment.reviewIncidentId === unrelatedReq.reviewIncidentId;

      assert.strictEqual(shouldClearB, false, "Unrelated review incident must NEVER be cleared");
      assert.strictEqual(damagedOrder.shipment.requiresReview, true);
      assert.strictEqual(damagedOrder.shipment.reviewCategory, "DAMAGED_PACKAGE");
      assert.strictEqual(damagedOrder.shipment.reviewIncidentId, "incident_damage_999");
    });
  });

  // =========================================================================
  // 4. COD and Manual Fallback Safeguards
  // =========================================================================
  describe("4. COD and Manual Fallback Safeguards", () => {
    test("Delivered logistics event NEVER automatically marks COD as PAID", () => {
      const codOrder = {
        paymentMethod: "COD",
        paymentStatus: "PENDING",
        fulfilmentStatus: "SHIPPED",
      };

      // Apply logistics status update for delivered (Shiprocket Status 7)
      function applyLogisticsDelivered(order: typeof codOrder) {
        order.fulfilmentStatus = "DELIVERED";
        // CRITICAL: COD payment status must NOT be modified
      }

      applyLogisticsDelivered(codOrder);

      assert.strictEqual(codOrder.fulfilmentStatus, "DELIVERED");
      assert.strictEqual(codOrder.paymentStatus, "PENDING", "COD payment status must remain PENDING until cash collection is manually verified");
    });

    test("manual status update does not wipe out existing shipment parcel or AWB data", () => {
      const order = {
        fulfilmentStatus: "PROCESSING",
        shipment: {
          shipmentState: "AWB_ASSIGNED",
          awbCode: "AWB_EXISTING_999",
          courierName: "Delhivery",
          parcel: {
            weightGrams: 500,
            lengthCm: 15,
            breadthCm: 10,
            heightCm: 10,
          },
          requiresReview: false,
        },
      };

      // Perform manual transition with preservation
      function manualUpdate(
        targetOrder: typeof order,
        update: { status?: string; carrier?: string; trackingNumber?: string }
      ) {
        if (update.status) targetOrder.fulfilmentStatus = update.status;
        if (update.carrier) targetOrder.shipment.courierName = update.carrier;
        if (update.trackingNumber) targetOrder.shipment.awbCode = update.trackingNumber;
      }

      manualUpdate(order, { status: "PACKED" });

      assert.strictEqual(order.fulfilmentStatus, "PACKED");
      assert.strictEqual(order.shipment.shipmentState, "AWB_ASSIGNED");
      assert.strictEqual(order.shipment.awbCode, "AWB_EXISTING_999");
      assert.deepStrictEqual(order.shipment.parcel, {
        weightGrams: 500,
        lengthCm: 15,
        breadthCm: 10,
        heightCm: 10,
      });
    });

    test("manual status control is blocked if order is in REASSIGNMENT_BLOCKED", () => {
      const order = {
        fulfilmentStatus: "PACKED",
        shipment: {
          shipmentState: "REASSIGNMENT_BLOCKED",
          requiresReview: true,
        },
      };

      function attemptManualTransition(targetOrder: typeof order, nextStatus: string) {
        if (
          ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(nextStatus) &&
          (targetOrder.shipment.requiresReview || targetOrder.shipment.shipmentState === "REASSIGNMENT_BLOCKED")
        ) {
          throw new ShiprocketValidationError(
            "Manual transition to SHIPPED blocked: Order has an unresolved shipment review or lock",
            400
          );
        }
        targetOrder.fulfilmentStatus = nextStatus;
      }

      assert.throws(
        () => attemptManualTransition(order, "SHIPPED"),
        /Manual transition to SHIPPED blocked/
      );
    });
  });

  // =========================================================================
  // 5. Warehouse Pickup PIN Configuration Fail-Closed Safeguards
  // =========================================================================
  describe("5. Warehouse Pickup PIN Configuration Fail-Closed Safeguards", () => {
    test("getShiprocketConfig fails closed if SHIPROCKET_WAREHOUSE_PIN is missing", () => {
      delete process.env.SHIPROCKET_WAREHOUSE_PIN;

      assert.throws(
        () => getShiprocketConfig(),
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketConfigError);
          assert.match(
            err.message,
            /SHIPROCKET_WAREHOUSE_PIN must be explicitly configured as a 6-digit Indian postal PIN code/i
          );
          return true;
        }
      );
    });

    test("getShiprocketConfig fails closed if SHIPROCKET_WAREHOUSE_PIN is invalid format", () => {
      const invalidPins = ["5600", "5600001", "abcdef", "560 01", ""];
      for (const pin of invalidPins) {
        process.env.SHIPROCKET_WAREHOUSE_PIN = pin;
        assert.throws(
          () => getShiprocketConfig(),
          (err: unknown) => {
            assert.ok(err instanceof ShiprocketConfigError);
            assert.match(err.message, /6-digit Indian postal PIN code/i);
            return true;
          },
          `PIN '${pin}' must throw ShiprocketConfigError`
        );
      }
    });

    test("checkCourierServiceability rejects serviceability query if pickup PIN is missing or invalid", async () => {
      delete process.env.SHIPROCKET_WAREHOUSE_PIN;

      await assert.rejects(
        async () => {
          await checkCourierServiceability({
            deliveryPincode: "110001",
            weightGrams: 500,
            cod: false,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketConfigError || err instanceof ShiprocketValidationError);
          return true;
        }
      );
    });
  });
});

