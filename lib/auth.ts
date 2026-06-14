import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth-constants";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/password";

/* ------------------------------------------------------------------ *
 * Authentication — single-household user with long-lived, sliding
 * session cookies. See BRIEF.md §7 Security and §9 decision 4.
 *
 * Server-only. Never import from a client component.
 * ------------------------------------------------------------------ */

export { SESSION_COOKIE };
export { hashPassword, verifyPassword };

/* 90-day sessions; slide forward when more than half the life has elapsed. */
const SESSION_DURATION_MS = 90 * 24 * 60 * 60 * 1000;
const SESSION_RENEW_AFTER_MS = SESSION_DURATION_MS / 2;

/* ------------------------------ sessions ----------------------------- */

export type SessionUser = { id: number; username: string };

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Mint a session for a user and set the cookie. The raw token only ever
 * lives in the cookie; the DB stores its SHA-256, so a DB leak cannot be
 * replayed as a session.
 */
export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const sessionId = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(schema.sessions).values({ id: sessionId, userId, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Validate the current request's session cookie against the DB. Expired
 * sessions are deleted. Valid sessions past their halfway point are slid
 * forward (both DB row and cookie). Returns the user or null.
 */
export async function validateSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessionId = hashToken(token);
  const row = await db
    .select({
      sessionId: schema.sessions.id,
      expiresAt: schema.sessions.expiresAt,
      userId: schema.users.id,
      username: schema.users.username,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, sessionId))
    .get();

  if (!row) return null;

  const now = Date.now();
  if (row.expiresAt.getTime() <= now) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  if (row.expiresAt.getTime() - now < SESSION_RENEW_AFTER_MS) {
    const expiresAt = new Date(now + SESSION_DURATION_MS);
    await db
      .update(schema.sessions)
      .set({ expiresAt })
      .where(eq(schema.sessions.id, sessionId));
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  }

  return { id: row.userId, username: row.username };
}

/** Convenience wrapper for server components / route handlers. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return validateSession();
}

/** Destroy the current session (DB row + cookie). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db
      .delete(schema.sessions)
      .where(eq(schema.sessions.id, hashToken(token)));
    cookieStore.delete(SESSION_COOKIE);
  }
}

/* ------------------------------- login ------------------------------- */

/**
 * Verify a username/password pair. Always runs an argon2 verification — even
 * when the user does not exist — against a dummy hash, so response timing
 * does not leak whether a username is valid.
 */
export async function authenticate(
  username: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .get();

  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return null;

  return { id: user.id, username: user.username };
}
