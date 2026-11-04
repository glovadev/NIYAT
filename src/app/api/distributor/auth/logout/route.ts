import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = apiSuccess({ message: "Distributor session ended" });

  response.cookies.set("__distributor_session", "", {
    maxAge: 0,
    path: "/",
  });

  response.cookies.set("__session", "", {
    maxAge: 0,
    path: "/",
  });

  return response;
}

