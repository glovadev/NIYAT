import { ClientSession } from "mongoose";

export type RestorationOutcome =
  | "COMPLETED"
  | "PARTIALLY_RESTORED"
  | "ALREADY_COMPLETED"
  | "SKIPPED_NOT_DEDUCTED"
  | "LOCKED_BY_OTHER_WORKER"
  | "TRANSACTIONS_UNAVAILABLE";

export interface ItemRestorationRecord {
  productId: string;
  sku: string;
  quantity: number;
  idempotencyKey: string;
  status: "RESTORED" | "ALREADY_RESTORED" | "FAILED";
  error?: string;
}

export interface RestorationResult {
  orderNumber: string;
  orderId: string;
  outcome: RestorationOutcome;
  totalItems: number;
  restoredItemsCount: number;
  alreadyRestoredCount: number;
  failedItemsCount: number;
  items: ItemRestorationRecord[];
  workerToken?: string;
  error?: string;
}

export interface RestorationOptions {
  workerToken?: string;
  leaseDurationMs?: number; // Default: 30,000ms (30 seconds)
  actorType?: "SYSTEM" | "ADMIN";
  actorId?: string;
  reason?: string;
  clientSession?: ClientSession;
}

