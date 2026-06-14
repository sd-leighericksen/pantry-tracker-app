import { NextResponse, type NextRequest } from "next/server";

import { authenticate, createSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/* 10 attempts per 15 minutes per IP. */
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "too_many_attempts" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { username, password } =
    (body as { username?: unknown; password?: unknown }) ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const user = await authenticate(username.trim(), password);
  if (!user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
