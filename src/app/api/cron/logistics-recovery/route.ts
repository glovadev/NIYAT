import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { verifyCronSecret } from "@/lib/shiprocket/webhook-auth";
import { runLogisticsRecoveryJob } from "@/lib/shiprocket/recovery";
import { safeWarn, safeError } from "@/lib/shiprocket/sanitize";

export const dynamic = "force-dynamic";

function extractProvidedCronToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cronKeyHeader = req.headers.get("x-cron-key");
  if (cronKeyHeader) {
    return cronKeyHeader.trim();
  }
  return null;
}

async function handleRecovery(req: NextRequest) {
  // 1. Strict Cron Authentication
  const token = extractProvidedCronToken(req);
  if (!verifyCronSecret(token)) {
    safeWarn("Cron", "Unauthorized access attempt to /api/cron/logistics-recovery");
    return NextResponse.json(
      {
        success: false,
        error: "UNAUTHORIZED",
        message: "Invalid or missing cron authentication token",
      },
      { status: 401 }
    );
  }

  // 2. Connect DB and run idempotent recovery job
  try {
    await connectToDatabase();
    const report = await runLogisticsRecoveryJob();

    return NextResponse.json(
      {
        success: true,
        report,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Logistics recovery job failed";
    safeError("Cron", `Recovery job failed: ${errorMsg}`);

    return NextResponse.json(
      {
        success: false,
        error: "RECOVERY_FAILED",
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleRecovery(req);
}

export async function POST(req: NextRequest) {
  return handleRecovery(req);
}

