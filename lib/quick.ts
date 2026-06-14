import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

/* ------------------------------------------------------------------ *
 * Quick Use + quick-add tiles (BRIEF §5.3). Quick Use is the scan-out
 * fallback when there's no barcode in hand (packaging already binned) —
 * a touch grid sorted by likelihood of use: in-stock first, then by how
 * often the item is used. Quick-add tiles are pinned barcode-less items.
 * ------------------------------------------------------------------ */

export type QuickItem = {
  id: number;
  name: string;
  icon: string | null;
  photo: string | null;
  quantity: number;
};

const USE_SOURCES = ["scan-out", "quick-use"] as const;

function usageCounts(): Map<number, number> {
  const rows = db
    .select({
      itemId: schema.stockEvents.itemId,
      n: sql<number>`count(*)`,
    })
    .from(schema.stockEvents)
    .where(inArray(schema.stockEvents.source, [...USE_SOURCES]))
    .groupBy(schema.stockEvents.itemId)
    .all();
  return new Map(rows.map((r) => [r.itemId, r.n]));
}

/** All non-archived items, ordered in-stock first then by usage frequency. */
export function listQuickUseItems(): QuickItem[] {
  const items = db
    .select({
      id: schema.items.id,
      name: schema.items.name,
      icon: schema.items.icon,
      photo: schema.items.photo,
      quantity: schema.items.quantity,
    })
    .from(schema.items)
    .where(isNull(schema.items.archivedAt))
    .all();

  const usage = usageCounts();
  return items.sort((a, b) => {
    const aIn = a.quantity > 0 ? 1 : 0;
    const bIn = b.quantity > 0 ? 1 : 0;
    if (aIn !== bIn) return bIn - aIn; // in-stock first
    const au = usage.get(a.id) ?? 0;
    const bu = usage.get(b.id) ?? 0;
    if (au !== bu) return bu - au; // most-used first
    return a.name.localeCompare(b.name);
  });
}

/** Pinned items, rendered as quick-add tiles on the kiosk home. */
export function listPinnedItems(): QuickItem[] {
  return db
    .select({
      id: schema.items.id,
      name: schema.items.name,
      icon: schema.items.icon,
      photo: schema.items.photo,
      quantity: schema.items.quantity,
    })
    .from(schema.items)
    .where(and(eq(schema.items.pinned, true), isNull(schema.items.archivedAt)))
    .orderBy(schema.items.name)
    .all();
}
