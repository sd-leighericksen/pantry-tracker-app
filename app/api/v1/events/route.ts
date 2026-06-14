import { NextResponse } from "next/server";

import { authenticateApi, unauthorised } from "@/lib/api-auth";
import { apiEvents } from "@/lib/api";

/* GET /api/v1/events?limit=50 — recent stock movements. */
export async function GET(req: Request) {
  if (!(await authenticateApi(req))) return unauthorised();
  const limit = Number(new URL(req.url).searchParams.get("limit")) || 50;
  return NextResponse.json({ events: apiEvents(Math.min(Math.max(limit, 1), 200)) });
}
