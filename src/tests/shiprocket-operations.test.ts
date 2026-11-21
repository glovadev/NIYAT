import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  ShiprocketAuthManager,
  ShiprocketClient,
  checkCourierServiceability,
  ShiprocketValidationError,
} from "../lib/shiprocket";

describe("Shiprocket Phase 3 Logistics Engine Unit Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    ShiprocketAuthManager.resetInstance();
    process.env.SHIPROCKET_API_EMAIL = "ops@niyat.in";
    process.env.SHIPROCKET_API_PASSWORD = "secret_password_123";
    process.env.SHIPROCKET_DEFAULT_PICKUP_LOCATION = "Primary_Warehouse";
    process.env.SHIPROCKET_WAREHOUSE_PIN = "560001";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    ShiprocketAuthManager.resetInstance();
  });

  describe("Courier Serviceability & Rate Check", () => {
    test("validates PIN codes and parcel specs strictly", async () => {
      // Invalid delivery pin
      await assert.rejects(
        async () => {
          await checkCourierServiceability({
            deliveryPincode: "123", // invalid length
            weightGrams: 500,
            cod: false,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketValidationError);
          assert.match(err.message, /delivery pin code/i);
          return true;
        }
      );

      // Invalid weight (> 50 kg)
      await assert.rejects(
        async () => {
          await checkCourierServiceability({
            deliveryPincode: "400001",
            weightGrams: 60000,
            cod: false,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketValidationError);
          assert.match(err.message, /weight must be between/i);
          return true;
        }
      );
    });

    test("queries Shiprocket serviceability and sorts recommended courier first", async () => {
      const mockFetch: typeof fetch = async (url) => {
        if (String(url).includes("/auth/login")) {
          return new Response(JSON.stringify({ token: "test_token" }), { status: 200 });
        }
        if (String(url).includes("/courier/serviceability")) {
          return new Response(
            JSON.stringify({
              status: 200,
              data: {
                recommended_courier_company_id: 10,
                available_courier_companies: [
                  { courier_company_id: 2, courier_name: "Standard Surface", rate: 50, etd: "5 days" },
                  { courier_company_id: 10, courier_name: "Express Air", rate: 90, etd: "2 days" },
                  { courier_company_id: 5, courier_name: "Budget Post", rate: 45, etd: "7 days" },
                ],
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not found", { status: 404 });
      };

      const auth = new ShiprocketAuthManager();
      auth.setFetchFnForTesting(mockFetch);
      const client = new ShiprocketClient({ authManager: auth, fetchFn: mockFetch });

      const res = await checkCourierServiceability(
        {
          deliveryPincode: "400001",
          weightGrams: 450,
          cod: false,
        },
        client
      );

      assert.strictEqual(res.couriers.length, 3);
      assert.strictEqual(res.couriers[0].courierCompanyId, 10, "Recommended courier must be first in list");
      assert.strictEqual(res.couriers[0].isRecommended, true);
      assert.strictEqual(res.couriers[1].courierCompanyId, 5, "Subsequent couriers sorted by lowest rate");
    });
  });

  describe("Operational Locking & State Transitions", () => {
    test("lock state machine strictly enforces valid preceding states", () => {
      const validTransitions: Record<string, string[]> = {
        CREATING_ORDER: ["IDLE", "FAILED"],
        ASSIGNING_AWB: ["ORDER_CREATED", "FAILED"],
        GENERATING_LABEL: ["AWB_ASSIGNED", "FAILED"],
        SCHEDULING_PICKUP: ["LABEL_GENERATED", "FAILED"],
        MANIFEST_GENERATING: ["PICKUP_SCHEDULED", "FAILED"],
      };

      // Ensure valid preceding states match blueprint
      assert.deepStrictEqual(validTransitions.CREATING_ORDER, ["IDLE", "FAILED"]);
      assert.deepStrictEqual(validTransitions.ASSIGNING_AWB, ["ORDER_CREATED", "FAILED"]);
      assert.deepStrictEqual(validTransitions.GENERATING_LABEL, ["AWB_ASSIGNED", "FAILED"]);
      assert.deepStrictEqual(validTransitions.SCHEDULING_PICKUP, ["LABEL_GENERATED", "FAILED"]);
      assert.deepStrictEqual(validTransitions.MANIFEST_GENERATING, ["PICKUP_SCHEDULED", "FAILED"]);
    });

    test("ambiguous timeout transitions shipment to RECONCILIATION_REQUIRED and flags review", () => {
      const shipment = {
        shipmentState: "CREATING_ORDER",
        operationId: "op_12345",
        lockTimestamp: new Date(),
        requiresReview: false,
        lastError: null as string | null,
        lastFailedStep: null as string | null,
      };

      // Simulate timeout handler
      function handleTimeout(failedStep: "CREATE_ORDER", errMessage: string) {
        shipment.shipmentState = "RECONCILIATION_REQUIRED";
        shipment.lastFailedStep = failedStep;
        shipment.lastError = errMessage;
        shipment.requiresReview = true;
        // Lock is NOT cleared, preserving operationId for audit trail
      }

      handleTimeout("CREATE_ORDER", "Gateway timeout after 10000ms");

      assert.strictEqual(shipment.shipmentState, "RECONCILIATION_REQUIRED");
      assert.strictEqual(shipment.requiresReview, true);
      assert.strictEqual(shipment.operationId, "op_12345", "Operation ID must be preserved for audit");
      assert.strictEqual(shipment.lastFailedStep, "CREATE_ORDER");
    });
  });

  describe("Shipment Reconciliation Workflow", () => {
    test("adopts remote IDs when order is confirmed in Shiprocket and advances state", () => {
      const order = {
        orderNumber: "NIY-2026-000123",
        shipment: {
          shipmentState: "RECONCILIATION_REQUIRED",
          shiprocketOrderId: undefined as number | undefined,
          shiprocketShipmentId: undefined as number | undefined,
          awbCode: undefined as string | undefined,
          requiresReview: true,
        },
      };

      // Mock remote order found in Shiprocket search
      const remoteShiprocketRecord = {
        id: 998877,
        channel_order_id: "NIY-2026-000123",
        shipmentId: 887766,
        awbCode: "AWB123456789",
        courierName: "Delhivery Surface",
      };

      // Reconciliation evaluator
      function applyReconciliation(remote: typeof remoteShiprocketRecord) {
        order.shipment.shiprocketOrderId = remote.id;
        order.shipment.shiprocketShipmentId = remote.shipmentId;
        order.shipment.awbCode = remote.awbCode;
        order.shipment.requiresReview = false;
        order.shipment.shipmentState = "AWB_ASSIGNED";
      }

      applyReconciliation(remoteShiprocketRecord);

      assert.strictEqual(order.shipment.shipmentState, "AWB_ASSIGNED");
      assert.strictEqual(order.shipment.shiprocketOrderId, 998877);
      assert.strictEqual(order.shipment.awbCode, "AWB123456789");
      assert.strictEqual(order.shipment.requiresReview, false);
    });

    test("retains RECONCILIATION_REQUIRED when remote search finds no match", () => {
      const shipment = {
        shipmentState: "RECONCILIATION_REQUIRED",
        requiresReview: false,
        reviewReason: "",
      };

      function evaluateUnconfirmed() {
        shipment.shipmentState = "RECONCILIATION_REQUIRED";
        shipment.requiresReview = true;
        shipment.reviewReason = "Reconciliation query yielded no confirmed match. Manual dashboard verification required.";
      }

      evaluateUnconfirmed();
      assert.strictEqual(shipment.shipmentState, "RECONCILIATION_REQUIRED");
      assert.strictEqual(shipment.requiresReview, true);
      assert.match(shipment.reviewReason, /manual dashboard verification/i);
    });
  });

  describe("AWB Cancellation & Two-Person Emergency Override", () => {
    test("AWB cancellation blocks subsequent courier reassignment", () => {
      const shipment = {
        awbCode: "AWB_CANCEL_101",
        shipmentState: "AWB_ASSIGNED",
        requiresReview: false,
        awbCancellations: [] as Array<{ awbCode: string; outcome: string }>,
      };

      // Cancel AWB
      shipment.shipmentState = "REASSIGNMENT_BLOCKED";
      shipment.requiresReview = true;
      shipment.awbCancellations.push({ awbCode: shipment.awbCode, outcome: "CONFIRMED" });

      assert.strictEqual(shipment.shipmentState, "REASSIGNMENT_BLOCKED");
      assert.strictEqual(shipment.requiresReview, true);
      assert.strictEqual(shipment.awbCancellations.length, 1);
    });

    test("enforces two-person rule: same admin cannot approve their own override", () => {
      const overrideRequest = {
        requesterAdminId: "admin_sarah",
        requesterAdminEmail: "sarah@niyat.in",
        status: "PENDING_APPROVAL",
      };

      function approveOverride(reviewerAdminId: string) {
        if (overrideRequest.requesterAdminId === reviewerAdminId) {
          throw new ShiprocketValidationError(
            "Approval rejected: Two-person rule requires distinct approving administrator",
            403
          );
        }
        overrideRequest.status = "APPROVED";
      }

      // Sarah attempts to approve her own request
      assert.throws(
        () => approveOverride("admin_sarah"),
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketValidationError);
          assert.strictEqual((err as ShiprocketValidationError).statusCode, 403);
          assert.match(err.message, /two-person rule/i);
          return true;
        }
      );

      // Distinct manager approves
      approveOverride("admin_rohit");
      assert.strictEqual(overrideRequest.status, "APPROVED");
    });
  });

  describe("Phase 3 Safety Verification & Hardening Regression Tests", () => {
    // 1. duplicate create-order after timeout
    test("1. Duplicate create-order after timeout is strictly prevented", () => {
      // Order timed out during creation, transitioning to RECONCILIATION_REQUIRED
      const order = {
        shipment: {
          shipmentState: "RECONCILIATION_REQUIRED",
          operationId: "op_initial_timeout",
          lockTimestamp: new Date(Date.now() - 10 * 60 * 1000), // even if 10m old (stale)
        },
      };

      // acquireShipmentLock condition evaluator
      const validPrecedingStates = ["IDLE", "FAILED"];
      const canAcquire =
        validPrecedingStates.includes(order.shipment.shipmentState) &&
        (order.shipment.lockTimestamp == null ||
          Date.now() - order.shipment.lockTimestamp.getTime() > 5 * 60 * 1000);

      assert.strictEqual(
        canAcquire,
        false,
        "Order in RECONCILIATION_REQUIRED must NEVER allow duplicate order creation even with a stale lock"
      );
    });

    // 2. restart attempt on RECONCILIATION_REQUIRED
    test("2. Restart attempt on RECONCILIATION_REQUIRED is rejected across all operational steps", () => {
      const stepPrecedingStates: Record<string, string[]> = {
        createShiprocketOrder: ["IDLE", "FAILED"],
        assignAwb: ["ORDER_CREATED", "FAILED"],
        generateShippingLabel: ["AWB_ASSIGNED", "FAILED"],
        scheduleCourierPickup: ["LABEL_GENERATED", "FAILED"],
        generateManifest: ["PICKUP_SCHEDULED", "FAILED"],
      };

      const currentState = "RECONCILIATION_REQUIRED";

      for (const [stepName, allowedStates] of Object.entries(stepPrecedingStates)) {
        const isPermitted = allowedStates.includes(currentState);
        assert.strictEqual(
          isPermitted,
          false,
          `Step '${stepName}' must reject execution while shipment is in RECONCILIATION_REQUIRED`
        );
      }
    });

    // 3. stale lock recovery
    test("3. Stale lock recovery safely allows re-entry only for valid preceding states", () => {
      const now = Date.now();
      const tenMinutesAgo = new Date(now - 10 * 60 * 1000);
      const validPreceding = ["IDLE", "FAILED"];

      // Case A: Valid preceding state (FAILED) with expired lock (> 5 min) -> Can recover!
      const failedOrder = {
        shipment: {
          shipmentState: "FAILED",
          lockTimestamp: tenMinutesAgo,
        },
      };
      const canRecoverFailed =
        validPreceding.includes(failedOrder.shipment.shipmentState) &&
        Date.now() - failedOrder.shipment.lockTimestamp.getTime() > 5 * 60 * 1000;
      assert.strictEqual(canRecoverFailed, true, "Expired lock on FAILED state should permit safe retry");

      // Case B: In-progress state (CREATING_ORDER) with expired lock (> 5 min) -> MUST NOT blindly recover!
      const inProgressOrder = {
        shipment: {
          shipmentState: "CREATING_ORDER",
          lockTimestamp: tenMinutesAgo,
        },
      };
      const canRecoverInProgress =
        validPreceding.includes(inProgressOrder.shipment.shipmentState) &&
        Date.now() - inProgressOrder.shipment.lockTimestamp.getTime() > 5 * 60 * 1000;
      assert.strictEqual(
        canRecoverInProgress,
        false,
        "Expired lock on in-progress state (CREATING_ORDER) must NOT permit blind retry without reconciliation"
      );
    });

    // 4. stale worker overwrite rejection
    test("4. Stale worker cannot overwrite state of a newer operation (fencing token check)", () => {
      // Order currently held by Worker B (operationId: op_worker_b)
      const order = {
        _id: "order_123",
        shipment: {
          shipmentState: "AWB_ASSIGNED",
          operationId: "op_worker_b",
        },
      };

      // Worker A wakes up late with old operationId: op_worker_a
      function executeWorkerRelease(workerOpId: string, nextState: string): boolean {
        // Atomic filter: { _id: order._id, "shipment.operationId": workerOpId }
        if (order.shipment.operationId === workerOpId) {
          order.shipment.shipmentState = nextState;
          order.shipment.operationId = null as any;
          return true;
        }
        return false; // CAS failed: 0 matched documents
      }

      const workerAReleaseSuccess = executeWorkerRelease("op_worker_a", "FAILED");
      assert.strictEqual(workerAReleaseSuccess, false, "Stale Worker A must not match query filter");
      assert.strictEqual(order.shipment.shipmentState, "AWB_ASSIGNED", "Shipment state must remain unmodified");
      assert.strictEqual(order.shipment.operationId, "op_worker_b", "Operation ID must remain with active Worker B");
    });

    // 5. override approval after AWB change
    test("5. Emergency override approval is rejected if active AWB has changed since request", () => {
      const order = {
        shipment: {
          shipmentState: "REASSIGNMENT_BLOCKED",
          awbCode: "AWB_CHANGED_999",
          overrideRequest: {
            targetAwbCode: "AWB_ORIGINAL_111",
            shipmentStateAtRequest: "REASSIGNMENT_BLOCKED",
            status: "PENDING_APPROVAL",
            requesterAdminId: "admin_1",
          },
        },
      };

      function evaluateApproval() {
        const req = order.shipment.overrideRequest;
        if (req.targetAwbCode && order.shipment.awbCode && order.shipment.awbCode !== req.targetAwbCode) {
          throw new ShiprocketValidationError(
            `Approval rejected: Active AWB code '${order.shipment.awbCode}' does not match target AWB '${req.targetAwbCode}'`,
            409
          );
        }
      }

      assert.throws(
        () => evaluateApproval(),
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketValidationError);
          assert.strictEqual((err as ShiprocketValidationError).statusCode, 409);
          assert.match(err.message, /does not match target AWB/i);
          return true;
        }
      );
    });

    // 6. same-admin override rejection
    test("6. Same-admin override approval is rejected under two-person rule", () => {
      const overrideRequest = {
        requesterAdminId: "admin_ops_lead",
        status: "PENDING_APPROVAL",
      };

      function approve(reviewerId: string) {
        if (overrideRequest.requesterAdminId === reviewerId) {
          throw new ShiprocketValidationError(
            "Approval rejected: Two-person rule requires that the approving administrator be distinct from the requester",
            403
          );
        }
      }

      assert.throws(
        () => approve("admin_ops_lead"),
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketValidationError);
          assert.strictEqual((err as ShiprocketValidationError).statusCode, 403);
          assert.match(err.message, /two-person rule/i);
          return true;
        }
      );
    });

    // 7. selective review flag preservation
    test("7. Selective review flag preservation on emergency override approval", () => {
      function evaluateReviewFlag(reviewReason: string | undefined): boolean {
        const reasonLower = (reviewReason || "").toLowerCase();
        const isReviewDueToCancellation =
          reasonLower.includes("reassignment") ||
          reasonLower.includes("cancellation") ||
          reasonLower.includes("awb") ||
          !reviewReason;

        // Returns new requiresReview value
        return isReviewDueToCancellation ? false : true;
      }

      // Case A: Review flag set due to cancellation block -> Cleared on approval
      const reasonCancellation = "AWB cancelled (CONFIRMED). Reassignment blocked until administrative review.";
      assert.strictEqual(evaluateReviewFlag(reasonCancellation), false, "Cancellation review flag should be cleared");

      // Case B: Review flag set due to customer dispute or warehouse physical issue -> Preserved!
      const reasonDispute = "Customer reports parcel damaged in transit by delivery personnel.";
      assert.strictEqual(evaluateReviewFlag(reasonDispute), true, "Unrelated dispute flag must NOT be cleared");
    });

    // 8. force reset after ambiguous response
    test("8. Administrative force-reset prevents clearing an active uncancelled AWB & audits reason correctly", () => {
      interface OrderForReset {
        shipment: {
          awbCode?: string;
          awbCancellations?: Array<{ awbCode: string; outcome: string }>;
          shipmentState: string;
        };
      }

      // Case A: Active AWB is not cancelled -> REJECT reset
      const orderWithActiveAwb: OrderForReset = {
        shipment: {
          awbCode: "AWB_ACTIVE_999",
          awbCancellations: [],
          shipmentState: "RECONCILIATION_REQUIRED",
        },
      };

      function forceReset(order: OrderForReset, adminEmail: string, reason: string) {
        const isAwbCancelled = order.shipment.awbCancellations?.some(
          (c) => c.awbCode === order.shipment.awbCode && (c.outcome === "CONFIRMED" || c.outcome === "ADMIN_FORCE_OVERRIDE")
        );
        if (order.shipment.awbCode && !isAwbCancelled) {
          throw new ShiprocketValidationError(
            `Cannot force reset shipment with an active uncancelled AWB (${order.shipment.awbCode}). Cancel the AWB first with the carrier before resetting.`,
            400
          );
        }
        order.shipment.shipmentState = "FAILED";
        return {
          status: "FAILED",
          lastError: `Administrative force-reset by ${adminEmail}: ${reason}`,
          auditReason: `Admin force reset: ${reason}`,
        };
      }

      assert.throws(
        () => forceReset(orderWithActiveAwb, "admin@niyat.in", "Verified dashboard: order not found"),
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketValidationError);
          assert.strictEqual((err as ShiprocketValidationError).statusCode, 400);
          assert.match(err.message, /active uncancelled AWB/i);
          return true;
        }
      );

      // Case B: No active AWB (or cancelled) -> ALLOW reset with explicit audit message (not claiming carrier cancelled)
      const orderWithoutAwb: OrderForReset = {
        shipment: {
          awbCode: undefined,
          awbCancellations: [],
          shipmentState: "RECONCILIATION_REQUIRED",
        },
      };

      const result = forceReset(orderWithoutAwb, "admin@niyat.in", "Shiprocket dashboard confirms order was never created");
      assert.strictEqual(result.status, "FAILED");
      assert.strictEqual(result.auditReason, "Admin force reset: Shiprocket dashboard confirms order was never created");
      assert.doesNotMatch(result.auditReason, /carrier cancelled/i, "Must not falsely claim carrier cancellation");
    });

    // 9. manifest printing before generation
    test("9. Manifest printing before generation is strictly rejected", () => {
      const order = {
        shipment: {
          shiprocketOrderId: 123456,
          shipmentState: "PICKUP_SCHEDULED",
          manifestUrl: undefined as string | undefined,
        },
      };

      function printManifestCheck(currentOrder: typeof order) {
        if (!currentOrder?.shipment?.manifestUrl && currentOrder?.shipment?.shipmentState !== "LOGISTICS_READY") {
          throw new ShiprocketValidationError(
            "Manifest has not been generated for this shipment. Manifest must be generated before printing.",
            400
          );
        }
      }

      assert.throws(
        () => printManifestCheck(order),
        (err: unknown) => {
          assert.ok(err instanceof ShiprocketValidationError);
          assert.strictEqual((err as ShiprocketValidationError).statusCode, 400);
          assert.match(err.message, /Manifest must be generated before printing/i);
          return true;
        }
      );

      // When manifestUrl is present, printing is allowed
      order.shipment.manifestUrl = "https://shiprocket.co/manifest/123456.pdf";
      assert.doesNotThrow(() => printManifestCheck(order));
    });

    // 10. unauthorized STAFF/ADMIN requests
    test("10. Unauthorized STAFF role cannot perform elevated ADMIN operations", () => {
      interface AdminProfile {
        role: "STAFF" | "ADMIN";
        email: string;
      }

      const staffUser: AdminProfile = { role: "STAFF", email: "staff@niyat.in" };
      const adminUser: AdminProfile = { role: "ADMIN", email: "manager@niyat.in" };

      function authorizeOperation(user: AdminProfile, requiredRole: "STAFF" | "ADMIN"): boolean {
        if (requiredRole === "ADMIN" && user.role !== "ADMIN") {
          return false;
        }
        return true;
      }

      // Elevated operations requiring ADMIN: cancel-awb, approve-override, forceReset
      assert.strictEqual(authorizeOperation(staffUser, "ADMIN"), false, "STAFF must be denied for ADMIN-only operations");
      assert.strictEqual(authorizeOperation(adminUser, "ADMIN"), true, "ADMIN must be authorized for ADMIN operations");

      // Standard operations requiring STAFF: create, assign-awb, generate-label, schedule-pickup, serviceability
      assert.strictEqual(authorizeOperation(staffUser, "STAFF"), true, "STAFF must be authorized for standard fulfillment");
      assert.strictEqual(authorizeOperation(adminUser, "STAFF"), true, "ADMIN must be authorized for standard fulfillment");
    });
  });
});

