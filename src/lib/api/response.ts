import { NextResponse } from "next/server";

export interface ApiMeta {
  requestId?: string;
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  [key: string]: unknown;
}

export function generateRequestId(): string {
  return `req_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
}

export function apiSuccess<T>(
  data: T,
  meta?: ApiMeta,
  status = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        requestId: meta?.requestId || generateRequestId(),
        ...meta,
      },
    },
    { status }
  );
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: Array<{ field?: string; issue: string }>,
  requestId?: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
        requestId: requestId || generateRequestId(),
      },
    },
    { status }
  );
}
