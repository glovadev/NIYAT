import type { Connection } from "mongoose";

/**
 * Checks whether the active MongoDB deployment supports multi-document transactions.
 * Transactions require a Replica Set (e.g. MongoDB Atlas) or Sharded Cluster.
 * Returns false on standalone mongod instances.
 *
 * Implements a 3-layer verification:
 * 1. Client topology type inspection (rejects "Single" standalone).
 * 2. MongoDB administrative hello/isMaster command verification (requires setName or isdbgrid).
 * 3. Live capability probe executing an actual read operation within a transaction session.
 */
export async function checkTransactionsSupported(connection: Connection): Promise<boolean> {
  try {
    const client = connection.getClient();
    const topology = (client as unknown as { topology?: { description?: { type?: string } } })?.topology;
    const topologyType = topology?.description?.type;

    // Layer 1: Check driver client topology description
    if (topologyType === "Single") {
      return false;
    }

    // Layer 2: Query MongoDB deployment server configuration via hello command
    if (connection.db) {
      try {
        const helloResult = await connection.db.admin().command({ hello: 1 });
        const isReplicaSet = typeof helloResult.setName === "string" && helloResult.setName.length > 0;
        const isSharded = helloResult.msg === "isdbgrid";

        if (!isReplicaSet && !isSharded) {
          // Explicitly standalone mongod deployment
          return false;
        }
      } catch {
        // If admin hello is restricted by permissions, proceed to Layer 3 live probe
      }
    }

    // Layer 3: Live capability probe executing an actual server operation within a transaction
    // MongoDB drivers only contact the server about transaction viability on the first operation.
    const testSession = await connection.startSession();
    try {
      let isSupported = false;
      await testSession.withTransaction(async () => {
        if (connection.db) {
          // Execute an actual lightweight database read within the transaction
          await connection.db.collection("orders").findOne({}, { session: testSession, projection: { _id: 1 } });
        }
        isSupported = true;
      });
      return isSupported;
    } catch (txErr: unknown) {
      const msg = txErr instanceof Error ? txErr.message : String(txErr);
      if (
        msg.includes("replica set member") ||
        msg.includes("Transaction numbers are only allowed") ||
        msg.includes("transactions are not supported") ||
        msg.includes("no replica set")
      ) {
        return false;
      }
      return false;
    } finally {
      await testSession.endSession().catch(() => {});
    }
  } catch {
    return false;
  }
}
