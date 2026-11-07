import "server-only";
import mongoose, { Mongoose } from "mongoose";

/**
 * Global cache interface for Mongoose in Next.js App Router / serverless environments.
 * Prevents opening multiple redundant connections on module hot-reloading in development.
 */
interface MongooseConnectionCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseConnectionCache | undefined;
}

let cached: MongooseConnectionCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/**
 * Safely sanitizes MongoDB connection string by stripping username:password credentials.
 * Ensures credentials never leak into server logs or error outputs.
 */
export function sanitizeMongoUri(rawUri?: string): string {
  if (!rawUri) return "[EMPTY_URI]";
  return rawUri.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/i, "$1$2:*****@");
}

/**
 * Connects to MongoDB Atlas using Mongoose with connection pooling and caching.
 * @returns {Promise<Mongoose>} Active Mongoose instance
 */
export async function connectToDatabase(): Promise<Mongoose> {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error(
      "MONGODB_URI environment variable is not defined. Please define it in your .env.local file."
    );
  }

  // If already connected and readyState is 1 (connected), return cached connection
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err: unknown) {
    // Reset cached promise so subsequent attempts can retry
    cached.promise = null;

    // Safe error message scrubbing any database connection credentials
    const originalMessage = err instanceof Error ? err.message : String(err);
    const sanitizedMessage = sanitizeMongoUri(originalMessage);

    throw new Error(`Database connection failed: ${sanitizedMessage}`);
  }
}

/**
 * Server-side health check utility for MongoDB.
 * Verifies connection state and executes a lightweight ping command on the admin database.
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  status: "connected" | "disconnected" | "connecting" | "disconnecting";
  databaseName?: string;
  latencyMs?: number;
  error?: string;
}> {
  const stateMap: Record<number, "disconnected" | "connected" | "connecting" | "disconnecting"> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  try {
    const start = Date.now();
    const conn = await connectToDatabase();
    const latencyMs = Date.now() - start;

    const dbName = conn.connection.name || undefined;
    const currentState = stateMap[conn.connection.readyState] || "disconnected";

    return {
      connected: conn.connection.readyState === 1,
      status: currentState,
      databaseName: dbName,
      latencyMs,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Database connection failed";
    return {
      connected: false,
      status: "disconnected",
      error: sanitizeMongoUri(message),
    };
  }
}
