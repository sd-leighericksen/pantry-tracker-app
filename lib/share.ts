import "server-only";

import { randomBytes } from "node:crypto";

import { getSetting, setSetting } from "@/lib/settings";
import { listShoppingList } from "@/lib/shopping";

/* ------------------------------------------------------------------ *
 * Tokenised read-only shopping list (BRIEF §5.5). Off by default; the
 * token in the URL is the only access control. One active token at a time.
 * ------------------------------------------------------------------ */

const SHARE_KEY = "share_token";

/** The active share token, or null when sharing is disabled. */
export function getShareToken(): string | null {
  const t = getSetting(SHARE_KEY);
  return t && t.length > 0 ? t : null;
}

/** Enable sharing (regenerates the token, invalidating any old link). */
export function enableSharing(): string {
  const token = randomBytes(18).toString("base64url");
  setSetting(SHARE_KEY, token);
  return token;
}

export function disableSharing(): void {
  setSetting(SHARE_KEY, "");
}

export type SharedItem = { name: string; store: string | null; needed: number | null };

/** Pending list for the public view: names + store only, no ids or controls. */
export function sharedList(): SharedItem[] {
  return listShoppingList()
    .filter((s) => s.status === "pending")
    .map((s) => ({
      name: s.name,
      store: s.groupStoreName === "Unassigned" ? null : s.groupStoreName,
      needed: s.needed,
    }));
}
