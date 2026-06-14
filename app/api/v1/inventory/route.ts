import { NextResponse } from "next/server";

import { authenticateApi, unauthorised } from "@/lib/api-auth";
import { apiInventory } from "@/lib/api";

/* GET /api/v1/inventory — full item list. */
export async function GET(req: Request) {
  if (!(await authenticateApi(req))) return unauthorised();
  return NextResponse.json({ items: apiInventory() });
}
