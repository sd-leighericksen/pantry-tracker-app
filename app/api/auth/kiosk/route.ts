import { NextResponse, type NextRequest } from "next/server";
import { asc } from "drizzle-orm";

import { createSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { verifyDeviceToken } from "@/lib/device-tokens";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/* ------------------------------------------------------------------ *
 * Kiosk auto-login. A kiosk-kind device token in the URL is exchanged
 * for a normal household session cookie, so a keyboard-less kiosk can
 * authenticate itself silently (point Chromium at this URL on boot).
 *
 * The token is a real, revocable credential — revoke it in Settings →
 * Device & API tokens to lock a kiosk out. Only "kiosk" tokens are
 * accepted here, so an API/mobile token can't be used to bootstrap a
 * browser session.
 *
 *   GET /api/auth/kiosk?token=ptk_…&next=/kiosk
 * ------------------------------------------------------------------ */

const MAX_ATTEMPTS = 20;
const WINDOW_MS = 15 * 60 * 1000;

export async function GET(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`kiosk-auth:${ip}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "too_many_attempts" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const verified = await verifyDeviceToken(token);
  if (!verified || verified.kind !== "kiosk") {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  /* Single-household app: bind the session to the (one) household user. */
  const user = db
    .select({ id: schema.users.id })
    .from(schema.users)
    .orderBy(asc(schema.users.id))
    .get();
  if (!user) {
    return NextResponse.json({ error: "no_user" }, { status: 500 });
  }

  await createSession(user.id);

  /* Only allow same-site relative redirect targets. */
  const nextParam = req.nextUrl.searchParams.get("next");
  const dest =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/kiosk";
  /* Relative redirect: resolves against the external host the kiosk used
   * (e.g. https://pantry.nimbuscloud.au), not the container's bind address. */
  return new NextResponse(null, { status: 307, headers: { Location: dest } });
}
