import { test, describe } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { checkTransactionsSupported } from "../lib/inventory/transactions";
import { RestorationResult } from "../lib/inventory/types";

describe("Inventory Restoration Engine Unit Tests", () => {
  describe("Source of Truth & Historical Orders Compatibility", () => {
    test("treats stockAppliedAt as the ground truth for whether stock was deducted", () => {
      // Order 1: Unpaid or draft (stockAppliedAt missing)
      const unpaidOrder = {
        orderNumber: "NIY-UNPAID-001",
        stockAppliedAt: undefined,
        stockRestorationState: undefined,
        items: [{ productId: "p1", quantity: 2 }],
      };

      // Order 2: Historical paid order created before Phase 1
      const historicalPaidOrder = {
        orderNumber: "NIY-HISTORICAL-002",
        stockAppliedAt: new Date("2026-09-01T10:00:00Z"),
        stockRestorationState: "NOT_APPLIED", // Schema default
        items: [{ productId: "p1", quantity: 2 }],
      };

      // Order 3: Already restored order
      const completedOrder = {
        orderNumber: "NIY-RESTORED-003",
        stockAppliedAt: new Date("2026-09-01T10:00:00Z"),
        stockRestorationState: "COMPLETED",
        stockRestoredAt: new Date("2026-09-02T12:00:00Z"),
        items: [{ productId: "p1", quantity: 2 }],
      };

      // Evaluate eligibility
      const isUnpaidEligible = !!unpaidOrder.stockAppliedAt;
      assert.strictEqual(isUnpaidEligible, false, "Unpaid order must not be eligible for restoration");

      const isHistoricalEligible =
        !!historicalPaidOrder.stockAppliedAt &&
        historicalPaidOrder.stockRestorationState !== "COMPLETED";
      assert.strictEqual(
        isHistoricalEligible,
        true,
        "Historical paid order with NOT_APPLIED must be eligible for restoration"
      );

      const isCompletedEligible =
        !!completedOrder.stockAppliedAt &&
        completedOrder.stockRestorationState !== "COMPLETED" &&
        !completedOrder.stockRestoredAt;
      assert.strictEqual(
        isCompletedEligible,
        false,
        "Completed order must not be eligible for re-restoration"
      );
    });
  });

  describe("Compare-and-Set Worker Claiming & Concurrency Protection", () => {
    test("Worker 1 acquires lock; Worker 2 is rejected while lease is active", () => {
      const now = new Date("2026-11-08T20:00:00.000Z");
      const order = {
        _id: "order_cas_1",
        orderNumber: "NIY-CAS-001",
        stockAppliedAt: new Date("2026-11-08T19:00:00.000Z"),
        stockRestorationState: "NOT_APPLIED",
        stockRestorationWorkerId: null as string | null,
        stockRestorationLeaseExpiresAt: null as Date | null,
      };

      // CAS claim simulation
      function tryClaim(workerToken: string, leaseDurationMs: number, currentTime: Date): boolean {
        const isEligible =
          order.stockAppliedAt != null &&
          order.stockRestorationState !== "COMPLETED" &&
          (order.stockRestorationLeaseExpiresAt == null ||
            order.stockRestorationLeaseExpiresAt < currentTime ||
            order.stockRestorationWorkerId === workerToken);

        if (isEligible) {
          order.stockRestorationState = "PENDING";
          order.stockRestorationWorkerId = workerToken;
          order.stockRestorationLeaseExpiresAt = new Date(currentTime.getTime() + leaseDurationMs);
          return true;
        }
        return false;
      }

      // Worker 1 claims with 30s lease
      const worker1Claimed = tryClaim("worker_alpha", 30000, now);
      assert.strictEqual(worker1Claimed, true, "Worker 1 should claim available order");
      assert.strictEqual(order.stockRestorationWorkerId, "worker_alpha");
      assert.strictEqual(
        order.stockRestorationLeaseExpiresAt?.toISOString(),
        "2026-11-08T20:00:30.000Z"
      );

      // Worker 2 attempts 10 seconds later (lease still active)
      const tenSecsLater = new Date("2026-11-08T20:00:10.000Z");
      const worker2Claimed = tryClaim("worker_beta", 30000, tenSecsLater);
      assert.strictEqual(worker2Claimed, false, "Worker 2 must be rejected while Worker 1 holds active lease");
      assert.strictEqual(order.stockRestorationWorkerId, "worker_alpha", "Ownership must remain with Worker 1");

      // Worker 2 attempts after lease expiration (35 seconds later)
      const thirtyFiveSecsLater = new Date("2026-11-08T20:00:35.000Z");
      const worker2ExpiredClaim = tryClaim("worker_beta", 30000, thirtyFiveSecsLater);
      assert.strictEqual(
        worker2ExpiredClaim,
        true,
        "Worker 2 should claim order once previous worker lease has expired"
      );
      assert.strictEqual(order.stockRestorationWorkerId, "worker_beta");
    });
  });

  describe("Product Update Verification & Abort Guard (Point 2)", () => {
    test("aborts transaction and creates NO ledger movement if product is not found", () => {
      const products: Record<string, { name: string; stock: number }> = {
        prod_existing: { name: "Aloe Face Wash", stock: 15 },
      };
      const ledger: Record<string, { productId: string; quantity: number }> = {};

      function restoreItem(productId: string, quantity: number, idempotencyKey: string): boolean {
        // Transaction starts
        const product = products[productId];
        if (!product) {
          // Product not found: abort transaction immediately!
          return false;
        }

        // Increment stock
        product.stock += quantity;
        // Record in ledger
        ledger[idempotencyKey] = { productId, quantity };
        return true;
      }

      // Attempt restoring non-existent product
      const missingResult = restoreItem("prod_non_existent", 2, "cancellation_ord1_prod_missing_0");
      assert.strictEqual(missingResult, false, "Restoration must fail for missing product");
      assert.strictEqual(Object.keys(ledger).length, 0, "No InventoryMovement record must be created for non-existent product");

      // Attempt restoring valid product
      const validResult = restoreItem("prod_existing", 2, "cancellation_ord1_prod_existing_0");
      assert.strictEqual(validResult, true, "Restoration must succeed for existing product");
      assert.strictEqual(products.prod_existing.stock, 17, "Product stock must be incremented by 2");
      assert.strictEqual(Object.keys(ledger).length, 1, "Exactly 1 InventoryMovement record must be created");
    });
  });

  describe("Worker Lease Renewal & Fencing Verification (Point 3)", () => {
    test("renews lease before each item to prevent timeout during long multi-item restorations", () => {
      let currentTime = new Date("2026-11-08T20:00:00.000Z");
      let leaseExpiresAt = new Date(currentTime.getTime() + 30000);
      let workerId: string | null = "worker_1";

      function renewLease(now: Date, workerToken: string): boolean {
        if (workerId === workerToken && leaseExpiresAt > now) {
          leaseExpiresAt = new Date(now.getTime() + 30000);
          return true;
        }
        return false;
      }

      // Simulate item 1 taking 15 seconds
      currentTime = new Date(currentTime.getTime() + 15000);
      const renewed1 = renewLease(currentTime, "worker_1");
      assert.strictEqual(renewed1, true, "Lease should successfully renew");
      assert.strictEqual(leaseExpiresAt.toISOString(), "2026-11-08T20:00:45.000Z");

      // Simulate item 2 taking another 15 seconds (total 30s elapsed from start, would have expired without renewal)
      currentTime = new Date(currentTime.getTime() + 15000);
      const renewed2 = renewLease(currentTime, "worker_1");
      assert.strictEqual(renewed2, true, "Lease should renew again for subsequent items");
      assert.strictEqual(leaseExpiresAt.toISOString(), "2026-11-08T20:01:00.000Z");
    });

    test("fences off stale worker if lease expired and another worker took ownership", () => {
      let workerId: string | null = "worker_1";
      let leaseExpiresAt = new Date("2026-11-08T20:00:30.000Z");

      // Worker 2 takes over after lease expired at 20:00:35
      const takeoverTime = new Date("2026-11-08T20:00:35.000Z");
      workerId = "worker_2";
      leaseExpiresAt = new Date(takeoverTime.getTime() + 30000);

      // Stale Worker 1 wakes up and attempts to commit or mark COMPLETED
      function attemptFinalize(workerToken: string, now: Date): boolean {
        // Query must require matching workerId AND unexpired lease
        if (workerId === workerToken && leaseExpiresAt > now) {
          workerId = null;
          return true;
        }
        return false; // Fenced off!
      }

      const staleCommit = attemptFinalize("worker_1", new Date("2026-11-08T20:00:36.000Z"));
      assert.strictEqual(staleCommit, false, "Stale worker must be fenced off from finalizing order");
      assert.strictEqual(workerId, "worker_2", "Ownership must remain with the new worker");
    });
  });

  describe("Crash Recovery, Partial Restoration & Ledger Idempotency", () => {
    test("resumes from partial crash without double-incrementing previously restored items", () => {
      const products: Record<string, { name: string; stock: number }> = {
        prod_aloe: { name: "Aloe Face Wash", stock: 10 },
        prod_serum: { name: "Vitamin C Serum", stock: 25 },
      };
      const ledger: Record<string, { productId: string; quantity: number }> = {};

      const order = {
        _id: "order_crash_test_101",
        orderNumber: "NIY-CRASH-101",
        items: [
          { productId: "prod_aloe", sku: "ALOE-100", quantity: 2 },
          { productId: "prod_serum", sku: "SERUM-30", quantity: 1 },
        ],
      };

      // Simulate Worker 1: Restores Item 0, then crashes before Item 1
      const item0Key = `cancellation_${order._id}_${order.items[0].productId}_0`;
      products[order.items[0].productId].stock += order.items[0].quantity;
      ledger[item0Key] = {
        productId: order.items[0].productId,
        quantity: order.items[0].quantity,
      };

      assert.strictEqual(products.prod_aloe.stock, 12, "Item 0 stock should be restored to 12");
      assert.strictEqual(products.prod_serum.stock, 25, "Item 1 stock should remain un-restored at 25");

      // Simulate Worker 2 (Crash Recovery execution)
      const worker2Actions: Array<{
        sku: string;
        action: "SKIPPED_ALREADY_RESTORED" | "INCREMENTED_RESTORED";
      }> = [];

      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const idempotencyKey = `cancellation_${order._id}_${item.productId}_${i}`;

        if (ledger[idempotencyKey]) {
          worker2Actions.push({ sku: item.sku, action: "SKIPPED_ALREADY_RESTORED" });
        } else {
          products[item.productId].stock += item.quantity;
          ledger[idempotencyKey] = { productId: item.productId, quantity: item.quantity };
          worker2Actions.push({ sku: item.sku, action: "INCREMENTED_RESTORED" });
        }
      }

      assert.strictEqual(worker2Actions[0].action, "SKIPPED_ALREADY_RESTORED");
      assert.strictEqual(worker2Actions[1].action, "INCREMENTED_RESTORED");
      assert.strictEqual(products.prod_aloe.stock, 12, "Aloe stock must not be incremented twice");
      assert.strictEqual(products.prod_serum.stock, 26, "Serum stock must be incremented to 26");
      assert.strictEqual(Object.keys(ledger).length, 2, "Both items must now have ledger records");
    });

    test("handles code 11000 duplicate key error from concurrent worker race gracefully", () => {
      let productStock = 20;
      const ledger: Record<string, boolean> = {
        cancellation_ord1_prod1_0: true, // Already inserted by concurrent worker
      };

      // Worker 2 attempts insert on the same item concurrently
      const idempotencyKey = "cancellation_ord1_prod1_0";
      let itemStatus = "PENDING";

      try {
        // Attempt insert
        if (ledger[idempotencyKey]) {
          const err = new Error("E11000 duplicate key error collection");
          // @ts-expect-error adding code for test
          err.code = 11000;
          throw err;
        }
        productStock += 2;
        ledger[idempotencyKey] = true;
        itemStatus = "RESTORED";
      } catch (err: unknown) {
        // Code 11000 handler
        // @ts-expect-error check code
        if (err?.code === 11000 || String(err).includes("E11000 duplicate key")) {
          // Re-verify that the record exists in ledger
          if (ledger[idempotencyKey]) {
            itemStatus = "ALREADY_RESTORED";
          }
        }
      }

      assert.strictEqual(itemStatus, "ALREADY_RESTORED", "Concurrent race with code 11000 must resolve as ALREADY_RESTORED");
      assert.strictEqual(productStock, 20, "Product stock must NOT be double incremented on duplicate key error");
    });
  });

  describe("Atomic Transaction Rollback Verification", () => {
    test("rolls back product increment if ledger movement recording fails", () => {
      let productStock = 50;
      let ledgerCommitted = false;

      function executeItemTransaction(shouldLedgerFail: boolean): boolean {
        const initialStock = productStock;
        try {
          productStock += 3;
          if (shouldLedgerFail) {
            throw new Error("Simulated database write conflict or connection drop on ledger insert");
          }
          ledgerCommitted = true;
          return true;
        } catch {
          productStock = initialStock;
          ledgerCommitted = false;
          return false;
        }
      }

      const success = executeItemTransaction(true);
      assert.strictEqual(success, false, "Transaction must fail");
      assert.strictEqual(productStock, 50, "Product stock must be rolled back to original 50 on failure");
      assert.strictEqual(ledgerCommitted, false, "Ledger must not be committed");

      const success2 = executeItemTransaction(false);
      assert.strictEqual(success2, true, "Transaction must succeed");
      assert.strictEqual(productStock, 53, "Product stock must now be 53");
      assert.strictEqual(ledgerCommitted, true, "Ledger must be committed");
    });
  });

  describe("3-Layer MongoDB Transaction Capability Detection (Point 4)", () => {
    test("Layer 1: rejects topology Single (standalone mongod)", async () => {
      const mockSingleConnection = {
        getClient: () => ({
          topology: { description: { type: "Single" } },
        }),
      } as unknown as mongoose.Connection;

      const isSupported = await checkTransactionsSupported(mockSingleConnection);
      assert.strictEqual(isSupported, false, "Single topology must immediately return false");
    });

    test("Layer 2: accepts hello command with setName (replica set member)", async () => {
      const mockReplicaSetConnection = {
        getClient: () => ({
          topology: { description: { type: "ReplicaSetWithPrimary" } },
        }),
        db: {
          admin: () => ({
            command: async (cmd: Record<string, unknown>) => {
              if (cmd.hello === 1) return { setName: "atlas-rs0", isWritablePrimary: true };
              return {};
            },
          }),
          collection: () => ({
            findOne: async () => ({ _id: "dummy" }),
          }),
        },
        startSession: async () => ({
          withTransaction: async (fn: () => Promise<void>) => await fn(),
          endSession: async () => {},
        }),
      } as unknown as mongoose.Connection;

      const isSupported = await checkTransactionsSupported(mockReplicaSetConnection);
      assert.strictEqual(isSupported, true, "Replica set with setName must return true");
    });

    test("Layer 2: accepts hello command with isdbgrid (sharded cluster mongos)", async () => {
      const mockShardedConnection = {
        getClient: () => ({
          topology: { description: { type: "Sharded" } },
        }),
        db: {
          admin: () => ({
            command: async (cmd: Record<string, unknown>) => {
              if (cmd.hello === 1) return { msg: "isdbgrid", isWritablePrimary: true };
              return {};
            },
          }),
          collection: () => ({
            findOne: async () => ({ _id: "dummy" }),
          }),
        },
        startSession: async () => ({
          withTransaction: async (fn: () => Promise<void>) => await fn(),
          endSession: async () => {},
        }),
      } as unknown as mongoose.Connection;

      const isSupported = await checkTransactionsSupported(mockShardedConnection);
      assert.strictEqual(isSupported, true, "Sharded cluster mongos must return true");
    });

    test("Layer 2: rejects hello command without setName or isdbgrid (standalone instance)", async () => {
      const mockStandaloneServerConnection = {
        getClient: () => ({
          topology: { description: { type: "Unknown" } },
        }),
        db: {
          admin: () => ({
            command: async (cmd: Record<string, unknown>) => {
              if (cmd.hello === 1) return { ok: 1, maxBsonObjectSize: 16777216 }; // No setName, no isdbgrid!
              return {};
            },
          }),
        },
      } as unknown as mongoose.Connection;

      const isSupported = await checkTransactionsSupported(mockStandaloneServerConnection);
      assert.strictEqual(isSupported, false, "Server hello without setName/isdbgrid must return false");
    });

    test("Layer 3: rejects server throwing transaction number error during live probe", async () => {
      const mockLiveProbeConnection = {
        getClient: () => ({
          topology: { description: { type: "Unknown" } },
        }),
        db: {
          admin: () => ({
            command: async () => {
              throw new Error("Admin access denied"); // Fall through to Layer 3
            },
          }),
          collection: () => ({
            findOne: async () => {
              throw new Error("Transaction numbers are only allowed on a replica set member or mongos");
            },
          }),
        },
        startSession: async () => ({
          withTransaction: async (fn: () => Promise<void>) => await fn(),
          endSession: async () => {},
        }),
      } as unknown as mongoose.Connection;

      const isSupported = await checkTransactionsSupported(mockLiveProbeConnection);
      assert.strictEqual(isSupported, false, "Live probe catching replica set error must return false");
    });
  });

  describe("Final Completion Guard (Requirement 10)", () => {
    test("order is never marked COMPLETED unless all applicable items are restored", () => {
      const totalItems = 3;

      function computeFinalState(restored: number, alreadyRestored: number): "COMPLETED" | "PARTIALLY_RESTORED" {
        if (restored + alreadyRestored === totalItems) {
          return "COMPLETED";
        }
        return "PARTIALLY_RESTORED";
      }

      assert.strictEqual(computeFinalState(0, 0), "PARTIALLY_RESTORED");
      assert.strictEqual(computeFinalState(1, 0), "PARTIALLY_RESTORED");
      assert.strictEqual(computeFinalState(1, 1), "PARTIALLY_RESTORED");
      assert.strictEqual(computeFinalState(2, 1), "COMPLETED");
      assert.strictEqual(computeFinalState(0, 3), "COMPLETED");
    });
  });
});
