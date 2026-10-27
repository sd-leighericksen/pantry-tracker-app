import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth-constants";

/* ------------------------------------------------------------------ *
 * Edge middleware: coarse gate + CSRF. Runs on every non-static request.
 *
 * This is an OPTIMISTIC check only — it can see the cookie's presence but
 * not the DB, so the real session validation happens in the data layer
 * (lib/auth.validateSession) inside server components and route handlers.
 * Bearer-authenticated API calls are validated in their route on Node.
 * ------------------------------------------------------------------ */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/* Routes reachable without a session cookie. */
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  /* Kiosk self-provisions a session from a kiosk-kind device token. */
  "/api/auth/kiosk",
  "/offline",
  /* PWA assets the browser fetches without a session. */
  "/manifest.webmanifest",
  "/sw.js",
]);

function isPublic(pathname: string): boolean {
  /* The tokenised read-only shopping list is the one unauthenticated surface
   * (BRIEF §5.5); the token itself is the access control. */
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/share/");
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const hasBearer = req.headers.has("authorization");

  /* --- CSRF: same-origin enforcement on cookie-driven mutations. --- */
  if (MUTATING_METHODS.has(req.method) && !hasBearer) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    /* No Origin (some same-origin GETs upgraded) is rejected for mutations;
     * browsers always send Origin on cross-origin and on unsafe methods. */
    if (!origin || new URL(origin).host !== host) {
      return NextResponse.json(
        { error: "csrf_origin_mismatch" },
        { status: 403 },
      );
    }
  }

  if (isPublic(pathname)) return NextResponse.next();

  /* --- Coarse auth gate. --- */
  const hasSession = req.cookies.has(SESSION_COOKIE);

  if (isApi) {
    /* API routes accept either a session cookie or a bearer token; the
     * route handler does the authoritative verification. */
    if (!hasSession && !hasBearer) {
      return NextResponse.json({ error: "unauthorised" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /* Everything except Next internals and static asset files. */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
