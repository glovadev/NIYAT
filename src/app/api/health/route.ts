import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db/mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkDatabaseHealth();

  if (!health.connected) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: health.error || "Database is currently unavailable.",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        status: "ok",
        dependencies: {
          database: {
            status: health.status,
            name: health.databaseName,
            latencyMs: health.latencyMs,
          },
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status: 200 }
  );
}
