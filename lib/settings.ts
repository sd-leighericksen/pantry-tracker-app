import "server-only";

import { eq, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

/* ------------------------------------------------------------------ *
 * Key/value settings (BRIEF §7: all settings stored in DB). Thin typed
 * accessors over the settings table.
 * ------------------------------------------------------------------ */

export function getSetting(key: string): string | null {
  const row = db
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .get();
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value, updatedAt: sql`(unixepoch())` },
    })
    .run();
}
