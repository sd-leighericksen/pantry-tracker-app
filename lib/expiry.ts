import "server-only";

import { asc, isNotNull } from "drizzle-orm";

import { db, schema } from "@/lib/db";

/* ------------------------------------------------------------------ *
 * Expiry tracking (BRIEF §5.4). Expiry lives on the incoming stock_events
 * (the lot). Since events are append-only and stock is count-based, the
 * remaining quantity per lot is computed FIFO over the event stream:
 * negative deltas consume the oldest open lots first. This gives an
 * accurate "what's still on hand and when does it expire" without ever
 * mutating the event log.
 *
 * Default Use Soon window: 3 days (BRIEF §5.4). A future setting can override.
 * ------------------------------------------------------------------ */

export const USE_SOON_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole days from today to `expiry` (negative = already expired). */
export function daysUntil(expiry: Date, todayStart = startOfToday()): number {
  return Math.floor((expiry.getTime() - todayStart) / DAY_MS);
}

type Lot = { expiry: Date | null; remaining: number };

/**
 * Open lots for one item after FIFO consumption, oldest first. Only meaningful
 * for items that have any expiry — callers pass the item's full event stream.
 */
function openLots(
  events: { delta: number; expiryDate: Date | null }[],
): Lot[] {
  const open: Lot[] = [];
  for (const ev of events) {
    if (ev.delta > 0) {
      open.push({ expiry: ev.expiryDate, remaining: ev.delta });
    } else {
      let need = -ev.delta;
      while (need > 0 && open.length > 0) {
        const lot = open[0]!;
        const take = Math.min(lot.remaining, need);
        lot.remaining -= take;
        need -= take;
        if (lot.remaining === 0) open.shift();
      }
    }
  }
  return open.filter((l) => l.remaining > 0);
}

export type ExpiryStatus = {
  /** Soonest open-lot expiry, ms epoch, or null if none on hand. */
  soonest: number | null;
  expired: boolean;
  expiringSoon: boolean;
};

/**
 * Per-item expiry status for the inventory grid. Only items with at least one
 * expiry-bearing event are scanned; everything else is implicitly "no expiry".
 */
export function expiryStatusByItem(): Map<number, ExpiryStatus> {
  const events = db
    .select({
      itemId: schema.stockEvents.itemId,
      delta: schema.stockEvents.delta,
      expiryDate: schema.stockEvents.expiryDate,
    })
    .from(schema.stockEvents)
    .orderBy(asc(schema.stockEvents.createdAt), asc(schema.stockEvents.id))
    .all();

  /* Group the full event stream per item (chronological). */
  const byItem = new Map<number, { delta: number; expiryDate: Date | null }[]>();
  for (const e of events) {
    const list = byItem.get(e.itemId);
    if (list) list.push(e);
    else byItem.set(e.itemId, [e]);
  }

  const today = startOfToday();
  const result = new Map<number, ExpiryStatus>();
  for (const [itemId, evs] of byItem) {
    const lots = openLots(evs).filter((l) => l.expiry !== null);
    if (lots.length === 0) continue;
    const soonest = lots.reduce(
      (min, l) => Math.min(min, l.expiry!.getTime()),
      Infinity,
    );
    const d = daysUntil(new Date(soonest), today);
    result.set(itemId, {
      soonest,
      expired: d < 0,
      expiringSoon: d >= 0 && d <= USE_SOON_DAYS,
    });
  }
  return result;
}

export type UseSoonEntry = {
  itemId: number;
  name: string;
  photo: string | null;
  expiry: number;
  quantity: number;
  daysLeft: number;
  expired: boolean;
};

/**
 * Items with open lots expiring within `withinDays` (or already expired),
 * soonest first. One entry per lot so different expiry dates list separately.
 */
export function listUseSoon(withinDays = USE_SOON_DAYS): UseSoonEntry[] {
  /* Only items that have ever carried an expiry are candidates. */
  const itemIds = [
    ...new Set(
      db
        .select({ itemId: schema.stockEvents.itemId })
        .from(schema.stockEvents)
        .where(isNotNull(schema.stockEvents.expiryDate))
        .all()
        .map((r) => r.itemId),
    ),
  ];
  if (itemIds.length === 0) return [];

  const items = new Map(
    db
      .select({
        id: schema.items.id,
        name: schema.items.name,
        photo: schema.items.photo,
        archivedAt: schema.items.archivedAt,
      })
      .from(schema.items)
      .all()
      .map((i) => [i.id, i]),
  );

  const allEvents = db
    .select({
      itemId: schema.stockEvents.itemId,
      delta: schema.stockEvents.delta,
      expiryDate: schema.stockEvents.expiryDate,
    })
    .from(schema.stockEvents)
    .orderBy(asc(schema.stockEvents.createdAt), asc(schema.stockEvents.id))
    .all();

  const byItem = new Map<number, { delta: number; expiryDate: Date | null }[]>();
  for (const e of allEvents) {
    const list = byItem.get(e.itemId);
    if (list) list.push(e);
    else byItem.set(e.itemId, [e]);
  }

  const today = startOfToday();
  const out: UseSoonEntry[] = [];
  for (const id of itemIds) {
    const item = items.get(id);
    if (!item || item.archivedAt) continue;
    for (const lot of openLots(byItem.get(id) ?? [])) {
      if (lot.expiry === null) continue;
      const daysLeft = daysUntil(lot.expiry, today);
      if (daysLeft > withinDays) continue;
      out.push({
        itemId: id,
        name: item.name,
        photo: item.photo,
        expiry: lot.expiry.getTime(),
        quantity: lot.remaining,
        daysLeft,
        expired: daysLeft < 0,
      });
    }
  }
  return out.sort((a, b) => a.expiry - b.expiry);
}
