import mongoose, { Connection, FilterQuery } from "mongoose";
import crypto from "crypto";
import { Order, IOrder } from "@/models/Order";
import { Product } from "@/models/Product";
import { InventoryMovement } from "@/models/InventoryMovement";
import { checkTransactionsSupported } from "./transactions";
import {
  RestorationOptions,
  RestorationResult,
  ItemRestorationRecord,
} from "./types";

export { checkTransactionsSupported };

/**
 * Safe, resumable, durable inventory restoration engine for cancelled orders.
 *
 * Guarantees:
 * 1. Uses `stockAppliedAt` as ground truth for whether stock was ever deducted.
 * 2. Supports historical orders even if `stockRestorationState` is absent or "NOT_APPLIED".
 * 3. CAS worker claiming prevents two concurrent workers from restoring the same order.
 * 4. Atomic per-item restoration using MongoDB multi-document transactions and deterministic idempotency keys.
 * 5. Standalone MongoDB without transaction support safely refuses non-atomic execution.
 * 6. Supports crash recovery and partial restoration without duplicate increments.
 * 7. Never marks an order COMPLETED until every applicable item is committed in the ledger.
 */
export async function restoreOrderInventory(
  orderIdOrDoc: string | IOrder,
  options?: RestorationOptions
): Promise<RestorationResult> {
  if (mongoose.connection.readyState !== 1) {
    const { connectToDatabase } = await import("@/lib/db/mongoose");
    await connectToDatabase();
  }

  // 1. Resolve order document
  let orderDoc: IOrder | null = null;
  if (typeof orderIdOrDoc === "string") {
    if (mongoose.Types.ObjectId.isValid(orderIdOrDoc)) {
      orderDoc = await Order.findById(orderIdOrDoc);
    } else {
      orderDoc = await Order.findOne({ orderNumber: orderIdOrDoc });
    }
  } else {
    orderDoc = orderIdOrDoc;
  }

  if (!orderDoc) {
    throw new Error(`Order not found: ${String(orderIdOrDoc)}`);
  }

  // 2. Source of Truth Check: Was stock ever deducted?
  if (!orderDoc.stockAppliedAt) {
    return {
      orderNumber: orderDoc.orderNumber,
      orderId: orderDoc._id.toString(),
      outcome: "SKIPPED_NOT_DEDUCTED",
      totalItems: orderDoc.items?.length || 0,
      restoredItemsCount: 0,
      alreadyRestoredCount: 0,
      failedItemsCount: 0,
      items: [],
      error: "Stock was never deducted for this order (unpaid or abandoned draft).",
    };
  }

  // 3. Already Completed Check
  if (orderDoc.stockRestorationState === "COMPLETED" || orderDoc.stockRestoredAt) {
    return {
      orderNumber: orderDoc.orderNumber,
      orderId: orderDoc._id.toString(),
      outcome: "ALREADY_COMPLETED",
      totalItems: orderDoc.items?.length || 0,
      restoredItemsCount: 0,
      alreadyRestoredCount: orderDoc.items?.length || 0,
      failedItemsCount: 0,
      items: (orderDoc.items || []).map((item, idx) => ({
        productId: item.productId.toString(),
        sku: item.sku,
        quantity: item.quantity,
        idempotencyKey: `cancellation_${orderDoc!._id.toString()}_${item.productId.toString()}_${idx}`,
        status: "ALREADY_RESTORED",
      })),
    };
  }

  // 4. Compare-and-Set Worker Claiming
  const workerToken = options?.workerToken || `worker_${crypto.randomUUID()}_${Date.now()}`;
  const leaseDurationMs = options?.leaseDurationMs ?? 30000;
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);

  const claimFilter: FilterQuery<IOrder> = {
    _id: orderDoc._id,
    stockAppliedAt: { $exists: true, $ne: null },
    stockRestorationState: { $ne: "COMPLETED" },
    $or: [
      { stockRestorationLeaseExpiresAt: { $exists: false } },
      { stockRestorationLeaseExpiresAt: null },
      { stockRestorationLeaseExpiresAt: { $lt: now } },
      { stockRestorationWorkerId: workerToken },
    ],
  };

  const claimedOrder = await Order.findOneAndUpdate(
    claimFilter,
    {
      $set: {
        stockRestorationState: "PENDING",
        stockRestorationWorkerId: workerToken,
        stockRestorationLeaseExpiresAt: leaseExpiresAt,
        stockRestorationStartedAt: orderDoc.stockRestorationStartedAt || now,
      },
    },
    { new: true }
  );

  if (!claimedOrder) {
    // Re-check why claim failed
    const freshOrder = await Order.findById(orderDoc._id);
    if (!freshOrder || !freshOrder.stockAppliedAt) {
      return {
        orderNumber: orderDoc.orderNumber,
        orderId: orderDoc._id.toString(),
        outcome: "SKIPPED_NOT_DEDUCTED",
        totalItems: orderDoc.items?.length || 0,
        restoredItemsCount: 0,
        alreadyRestoredCount: 0,
        failedItemsCount: 0,
        items: [],
      };
    }
    if (freshOrder.stockRestorationState === "COMPLETED" || freshOrder.stockRestoredAt) {
      return {
        orderNumber: freshOrder.orderNumber,
        orderId: freshOrder._id.toString(),
        outcome: "ALREADY_COMPLETED",
        totalItems: freshOrder.items?.length || 0,
        restoredItemsCount: 0,
        alreadyRestoredCount: freshOrder.items?.length || 0,
        failedItemsCount: 0,
        items: [],
      };
    }

    return {
      orderNumber: freshOrder.orderNumber,
      orderId: freshOrder._id.toString(),
      outcome: "LOCKED_BY_OTHER_WORKER",
      totalItems: freshOrder.items?.length || 0,
      restoredItemsCount: 0,
      alreadyRestoredCount: 0,
      failedItemsCount: 0,
      items: [],
      error: `Order is currently locked by worker '${freshOrder.stockRestorationWorkerId}' until ${freshOrder.stockRestorationLeaseExpiresAt?.toISOString()}`,
    };
  }

  // 5. MongoDB Transactions Availability Check (Requirement 8)
  const isTxSupported = await checkTransactionsSupported(mongoose.connection);
  if (!isTxSupported) {
    const errorMsg =
      "MongoDB transactions are unavailable on standalone deployment. Non-atomic inventory restoration is disabled for data integrity.";

    await Order.updateOne(
      { _id: orderDoc._id, stockRestorationWorkerId: workerToken },
      {
        $set: {
          lastRestorationError: errorMsg,
          stockRestorationLeaseExpiresAt: null, // Release lease so retry worker can execute once replica set is available
          stockRestorationWorkerId: null,
        },
      }
    );

    return {
      orderNumber: orderDoc.orderNumber,
      orderId: orderDoc._id.toString(),
      outcome: "TRANSACTIONS_UNAVAILABLE",
      totalItems: orderDoc.items.length,
      restoredItemsCount: 0,
      alreadyRestoredCount: 0,
      failedItemsCount: orderDoc.items.length,
      items: [],
      workerToken,
      error: errorMsg,
    };
  }

  // 6. Execute Atomic Per-Item Restoration
  const itemRecords: ItemRestorationRecord[] = [];
  let restoredItemsCount = 0;
  let alreadyRestoredCount = 0;
  let failedItemsCount = 0;
  let lastFailureError: string | undefined;

  for (let i = 0; i < orderDoc.items.length; i++) {
    const item = orderDoc.items[i];
    const idempotencyKey = `cancellation_${orderDoc._id.toString()}_${item.productId.toString()}_${i}`;

    // 6a. Worker Lease Renewal / Heartbeat (Point 3)
    // Ensures long restorations with multiple items never expire mid-flight
    const leaseRenewal = await Order.findOneAndUpdate(
      {
        _id: orderDoc._id,
        stockRestorationWorkerId: workerToken,
        stockRestorationLeaseExpiresAt: { $gt: new Date() },
      },
      {
        $set: {
          stockRestorationLeaseExpiresAt: new Date(Date.now() + leaseDurationMs),
        },
      },
      { new: true }
    );

    if (!leaseRenewal) {
      lastFailureError =
        "Worker lease expired or ownership lost; aborting restoration to prevent split-brain";
      failedItemsCount += orderDoc.items.length - i;
      break;
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // 6b. Fencing verification inside transaction session
        const leaseVerification = await Order.findOne({
          _id: orderDoc!._id,
          stockRestorationWorkerId: workerToken,
          stockRestorationLeaseExpiresAt: { $gt: new Date() },
        }).session(session);

        if (!leaseVerification) {
          throw new Error("Worker lease expired or was preempted during restoration transaction");
        }

        // 6c. Idempotency check against ledger
        const existingMovement = await InventoryMovement.findOne({
          idempotencyKey,
        }).session(session);

        if (existingMovement) {
          alreadyRestoredCount++;
          itemRecords.push({
            productId: item.productId.toString(),
            sku: item.sku,
            quantity: item.quantity,
            idempotencyKey,
            status: "ALREADY_RESTORED",
          });
          return;
        }

        // 6d. Product update verification (Point 2)
        if (!item.quantity || item.quantity <= 0) {
          throw new Error(`Invalid item restoration quantity ${item.quantity} for item ${item.sku}`);
        }

        const updatedProduct = await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stockQuantity: item.quantity } },
          { session, new: true }
        );

        if (!updatedProduct) {
          // Abort transaction! Never create ledger record for non-existent product
          throw new Error(
            `Product ${item.productId.toString()} (${item.productName}) not found; restoration aborted`
          );
        }

        // 6e. Immutable ledger movement insertion committed in same transaction
        await InventoryMovement.create(
          [
            {
              productId: item.productId,
              quantityChange: item.quantity,
              type: "CANCELLATION",
              reason:
                options?.reason ||
                `Restoration for cancelled order ${orderDoc!.orderNumber} (${item.sku} x${item.quantity})`,
              orderId: orderDoc!._id,
              actorType: options?.actorType || "SYSTEM",
              actorId: options?.actorId,
              idempotencyKey,
            },
          ],
          { session }
        );

        restoredItemsCount++;
        itemRecords.push({
          productId: item.productId.toString(),
          sku: item.sku,
          quantity: item.quantity,
          idempotencyKey,
          status: "RESTORED",
        });
      });
    } catch (itemErr: unknown) {
      // Handle duplicate-key error from competing worker race (Point 1)
      const isDuplicateKey =
        (typeof itemErr === "object" && itemErr !== null && (itemErr as { code?: number }).code === 11000) ||
        String(itemErr).includes("E11000 duplicate key");

      if (isDuplicateKey) {
        const committedMovement = await InventoryMovement.findOne({ idempotencyKey });
        if (committedMovement) {
          alreadyRestoredCount++;
          itemRecords.push({
            productId: item.productId.toString(),
            sku: item.sku,
            quantity: item.quantity,
            idempotencyKey,
            status: "ALREADY_RESTORED",
          });
          continue;
        }
      }

      failedItemsCount++;
      lastFailureError = itemErr instanceof Error ? itemErr.message : String(itemErr);
      itemRecords.push({
        productId: item.productId.toString(),
        sku: item.sku,
        quantity: item.quantity,
        idempotencyKey,
        status: "FAILED",
        error: lastFailureError,
      });

      if (lastFailureError.includes("Worker lease expired")) {
        break;
      }
    } finally {
      await session.endSession();
    }
  }

  // 7. Final Order State Transition (Point 3: Protected by worker lease ownership)
  // NEVER mark COMPLETED unless every applicable item has been safely restored!
  const allConfirmed = restoredItemsCount + alreadyRestoredCount === orderDoc.items.length;

  if (allConfirmed) {
    const finalUpdateResult = await Order.updateOne(
      {
        _id: orderDoc._id,
        stockRestorationWorkerId: workerToken,
        stockRestorationLeaseExpiresAt: { $gt: new Date() },
      },
      {
        $set: {
          stockRestorationState: "COMPLETED",
          stockRestoredAt: new Date(),
          stockRestorationWorkerId: null,
          stockRestorationLeaseExpiresAt: null,
          lastRestorationError: null,
        },
      }
    );

    if (finalUpdateResult.matchedCount === 0) {
      return {
        orderNumber: orderDoc.orderNumber,
        orderId: orderDoc._id.toString(),
        outcome: "LOCKED_BY_OTHER_WORKER",
        totalItems: orderDoc.items.length,
        restoredItemsCount,
        alreadyRestoredCount,
        failedItemsCount: 0,
        items: itemRecords,
        workerToken,
        error: "Worker lease expired or was preempted before marking order COMPLETED",
      };
    }

    return {
      orderNumber: orderDoc.orderNumber,
      orderId: orderDoc._id.toString(),
      outcome: "COMPLETED",
      totalItems: orderDoc.items.length,
      restoredItemsCount,
      alreadyRestoredCount,
      failedItemsCount: 0,
      items: itemRecords,
      workerToken,
    };
  } else {
    // Partial restoration or item failure
    await Order.updateOne(
      { _id: orderDoc._id, stockRestorationWorkerId: workerToken },
      {
        $set: {
          stockRestorationState: "PARTIALLY_RESTORED",
          lastRestorationError: lastFailureError || "Partial restoration failure",
          stockRestorationWorkerId: null, // Release lease so retry worker can recover remaining items
          stockRestorationLeaseExpiresAt: null,
        },
      }
    );

    return {
      orderNumber: orderDoc.orderNumber,
      orderId: orderDoc._id.toString(),
      outcome: "PARTIALLY_RESTORED",
      totalItems: orderDoc.items.length,
      restoredItemsCount,
      alreadyRestoredCount,
      failedItemsCount,
      items: itemRecords,
      workerToken,
      error: lastFailureError || "One or more items could not be restored",
    };
  }
}

