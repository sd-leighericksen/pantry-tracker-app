import "server-only";

import { eq, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { dispatch } from "@/lib/webhooks";

/* ------------------------------------------------------------------ *
 * Stock mutation path — the ONLY writer of items.quantity.
 *
 * Every quantity change appends a stock_events row and updates the
 * denormalised items.quantity snapshot inside one transaction. Crossing
 * the low-stock threshold auto-adds the item to the shopping list.
 * See CLAUDE.md ("every stock quantity change goes through one mutation
 * path") and BRIEF §5.5 / §10 decision 2.
 *
 * Never UPDATE items.quantity from anywhere else.
 * ------------------------------------------------------------------ */

export type StockSource =
  | "scan-in"
  | "scan-out"
  | "quick-use"
  | "quick-add"
  | "manual"
  | "ai"
  | "waste";

export type StockAdjustment = {
  itemId: number;
  /** The delta actually applied (a scan-out is clamped so stock never goes < 0). */
  applied: number;
  /** New quantity snapshot after the adjustment. */
  quantity: number;
  /** True when the new quantity is at or below the item's (non-zero) threshold. */
  lowStock: boolean;
  /** True when this adjustment created a pending shopping-list entry. */
  addedToList: boolean;
};

/** Incoming sources get an auto-calculated expiry from the item's shelf life. */
const INCOMING_SOURCES: ReadonlySet<StockSource> = new Set([
  "scan-in",
  "quick-add",
  "manual",
  "ai",
]);

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Apply a stock delta for an item. Negative deltas are clamped so quantity
 * never drops below zero. Returns the post-adjustment snapshot.
 *
 * Expiry handling on incoming (positive) deltas:
 *   - `expiryDate` omitted (undefined) → auto-calc from the item's
 *     `default_shelf_life_days` if set, else none (non-blocking; no scan prompt).
 *   - `expiryDate` passed explicitly (Date or null) → used verbatim.
 *
 * @throws if the item does not exist.
 */
export function adjustStock(
  itemId: number,
  delta: number,
  source: StockSource,
  expiryDate?: Date | null,
): StockAdjustment {
  const result = db.transaction((tx) => {
    const item = tx
      .select({
        quantity: schema.items.quantity,
        threshold: schema.items.threshold,
        defaultShelfLifeDays: schema.items.defaultShelfLifeDays,
      })
      .from(schema.items)
      .where(eq(schema.items.id, itemId))
      .get();

    if (!item) {
      throw new Error(`adjustStock: item ${itemId} not found`);
    }

    /* Clamp so a scan-out can't push quantity negative. */
    const applied = Math.max(delta, -item.quantity);
    const quantity = item.quantity + applied;

    if (applied !== 0) {
      /* Expiry only applies to incoming (positive) units. */
      let resolvedExpiry: Date | null = null;
      if (applied > 0) {
        resolvedExpiry =
          expiryDate !== undefined
            ? expiryDate
            : INCOMING_SOURCES.has(source) && item.defaultShelfLifeDays
              ? new Date(Date.now() + item.defaultShelfLifeDays * DAY_MS)
              : null;
      }

      tx.insert(schema.stockEvents)
        .values({ itemId, delta: applied, source, expiryDate: resolvedExpiry })
        .run();

      tx.update(schema.items)
        .set({ quantity, updatedAt: sql`(unixepoch())` })
        .where(eq(schema.items.id, itemId))
        .run();
    }

    const lowStock = item.threshold > 0 && quantity <= item.threshold;

    /* Auto-add to the shopping list on a downward threshold crossing. The
     * partial unique index (one pending row per item) makes this idempotent. */
    let addedToList = false;
    if (lowStock && applied < 0) {
      const res = tx
        .insert(schema.shoppingList)
        .values({ itemId, status: "pending", addedBy: "auto" })
        .onConflictDoNothing()
        .run();
      addedToList = res.changes > 0;
    }

    return { itemId, applied, quantity, lowStock, addedToList };
  });

  /* Emit webhooks after commit, fire-and-forget (BRIEF §5.7). */
  if (result.addedToList) {
    const name =
      db
        .select({ name: schema.items.name })
        .from(schema.items)
        .where(eq(schema.items.id, itemId))
        .get()?.name ?? "";
    const payload = { itemId, name, quantity: result.quantity };
    dispatch("item.below_threshold", payload);
    dispatch("shopping.item_added", { ...payload, source: "auto" });
  }

  return result;
}
