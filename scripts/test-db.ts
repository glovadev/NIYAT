import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

function maskCredentials(uri: string): string {
  return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/i, "$1$2:*****@");
}

async function runDatabaseVerification() {
  console.log("=================================================");
  console.log("NIYAT Skincare — MongoDB Connection Verification");
  console.log("=================================================");

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("\n❌ Error: MONGODB_URI is not set in .env.local.");
    console.error("Please add MONGODB_URI to your .env.local file.\n");
    process.exit(1);
  }

  const maskedUri = maskCredentials(uri);
  console.log(`\nConnecting to: ${maskedUri}`);

  if (uri.includes("YOUR_DB_PASSWORD")) {
    console.error("\n⚠️  WARNING: MONGODB_URI contains the placeholder 'YOUR_DB_PASSWORD'.");
    console.error("Please replace 'YOUR_DB_PASSWORD' in .env.local with your real MongoDB Atlas password.\n");
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });

    const latency = Date.now() - startTime;
    const db = conn.connection.db;

    if (!db) {
      throw new Error("Connected but database object is undefined");
    }

    // Ping the database
    const pingResult = await db.admin().ping();

    console.log("\n✅ Connection Successful!");
    console.log(` - Database Name:     ${conn.connection.name}`);
    console.log(` - Host / Cluster:    ${conn.connection.host}`);
    console.log(` - Connection State:  Ready (readyState = ${conn.connection.readyState})`);
    console.log(` - Ping Response:     ${JSON.stringify(pingResult)}`);
    console.log(` - Roundtrip Latency: ${latency} ms\n`);

    await mongoose.disconnect();
    console.log("Disconnected gracefully.");
    process.exit(0);
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : String(err);
    const safeError = maskCredentials(rawError);

    console.error("\n❌ Connection Failed!");
    console.error(` - Error: ${safeError}\n`);
    process.exit(1);
  }
}

runDatabaseVerification();
