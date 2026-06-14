import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";

import { db, schema } from "@/lib/db";

/* ------------------------------------------------------------------ *
 * Device & API tokens — named, revocable bearer credentials for the
 * kiosk, n8n, Home Assistant, and mobile. See BRIEF.md §7 Security.
 *
 * The raw token is shown to the user exactly once, on issue. The DB
 * only ever stores its SHA-256, so a DB leak yields no usable tokens.
 * ------------------------------------------------------------------ */

export type DeviceTokenKind = "kiosk" | "api" | "mobile";

/* Prefix makes a leaked token recognisable and lets us scope future formats. */
const TOKEN_PREFIX = "ptk_";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type IssuedToken = {
  id: number;
  name: string;
  kind: DeviceTokenKind;
  /** Raw bearer value — present only here, only once. */
  token: string;
};

/** Mint a new device token. Returns the raw value; it is never recoverable. */
export async function issueDeviceToken(
  name: string,
  kind: DeviceTokenKind,
): Promise<IssuedToken> {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  const row = await db
    .insert(schema.deviceTokens)
    .values({ name, kind, tokenHash: hashToken(token) })
    .returning({ id: schema.deviceTokens.id })
    .get();

  return { id: row.id, name, kind, token };
}

export type VerifiedToken = {
  id: number;
  name: string;
  kind: DeviceTokenKind;
};

/**
 * Verify a raw bearer token. Returns the token record if it exists and is
 * not revoked, and touches lastUsedAt. Returns null otherwise.
 */
export async function verifyDeviceToken(
  token: string,
): Promise<VerifiedToken | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const row = await db
    .select()
    .from(schema.deviceTokens)
    .where(
      and(
        eq(schema.deviceTokens.tokenHash, hashToken(token)),
        isNull(schema.deviceTokens.revokedAt),
      ),
    )
    .get();

  if (!row) return null;

  await db
    .update(schema.deviceTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.deviceTokens.id, row.id));

  return { id: row.id, name: row.name, kind: row.kind as DeviceTokenKind };
}

/**
 * Pull a bearer token out of an Authorization header and verify it.
 * Accepts `Authorization: Bearer <token>`.
 */
export async function verifyBearer(
  authHeader: string | null,
): Promise<VerifiedToken | null> {
  if (!authHeader) return null;
  const [scheme, value] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return verifyDeviceToken(value);
}

export type ListedToken = {
  id: number;
  name: string;
  kind: DeviceTokenKind;
  lastUsedAt: Date | null;
  createdAt: Date;
};

/** List active (non-revoked) tokens for the settings UI. */
export async function listDeviceTokens(): Promise<ListedToken[]> {
  const rows = await db
    .select({
      id: schema.deviceTokens.id,
      name: schema.deviceTokens.name,
      kind: schema.deviceTokens.kind,
      lastUsedAt: schema.deviceTokens.lastUsedAt,
      createdAt: schema.deviceTokens.createdAt,
    })
    .from(schema.deviceTokens)
    .where(isNull(schema.deviceTokens.revokedAt))
    .all();

  return rows.map((r) => ({ ...r, kind: r.kind as DeviceTokenKind }));
}

/** Soft-revoke a token. Idempotent. */
export async function revokeDeviceToken(id: number): Promise<void> {
  await db
    .update(schema.deviceTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.deviceTokens.id, id),
        isNull(schema.deviceTokens.revokedAt),
      ),
    );
}
