import "server-only";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { verifyBearer } from "@/lib/device-tokens";

/* ------------------------------------------------------------------ *
 * Auth for the REST API (BRIEF §5.7). Accepts either a logged-in session
 * cookie (so the app's own fetches work) or a bearer device/API token
 * (n8n, Home Assistant). Bearer tokens are CSRF-immune, so middleware
 * lets bearer mutations through; this is the authoritative check.
 * ------------------------------------------------------------------ */

export async function authenticateApi(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization");
  if (header) {
    const token = await verifyBearer(header);
    if (token) return true;
  }
  return (await getCurrentUser()) !== null;
}

/** 401 JSON helper. */
export function unauthorised(): NextResponse {
  return NextResponse.json({ error: "unauthorised" }, { status: 401 });
}
