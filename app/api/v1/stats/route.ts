import { NextResponse } from "next/server";

import { authenticateApi, unauthorised } from "@/lib/api-auth";
import { apiStats } from "@/lib/api";

/* GET /api/v1/stats — counts + shopping list for Home Assistant sensors. */
export async function GET(req: Request) {
  if (!(await authenticateApi(req))) return unauthorised();
  return NextResponse.json(apiStats());
}
