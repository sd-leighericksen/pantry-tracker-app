import "server-only";

import { desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";

/* ------------------------------------------------------------------ *
 * Purchase history & insights (BRIEF §5.6). Everything is derived from the
 * append-only stock_events log — no extra tables. Positive deltas are
 * acquisitions ("bought/added"); negative deltas are consumption.
 * ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export type ItemInsights = {
  totalIn: number;
  totalOut: number;
  lastBoughtAt: number | null;
  /** Distinct days with an acquisition — i.e. shopping occasions. */
  purchaseOccasions: number;
  /** Average days between purchase occasions, or null if < 2. */
  avgIntervalDays: number | null;
  /** Average units consumed per week over the item's active life, or null. */
  avgWeeklyUse: number | null;
  /** Heuristic threshold (~a week's usage), or null if not enough data. */
  suggestedThreshold: number | null;
};

export function itemInsights(itemId: number): ItemInsights {
  const events = db
    .select({
      delta: schema.stockEvents.delta,
      createdAt: schema.stockEvents.createdAt,
    })
    .from(schema.stockEvents)
    .where(eq(schema.stockEvents.itemId, itemId))
    .orderBy(schema.stockEvents.createdAt)
    .all();

  if (events.length === 0) {
    return {
      totalIn: 0,
      totalOut: 0,
      lastBoughtAt: null,
      purchaseOccasions: 0,
      avgIntervalDays: null,
      avgWeeklyUse: null,
      suggestedThreshold: null,
    };
  }

  let totalIn = 0;
  let totalOut = 0;
  let lastBoughtAt: number | null = null;
  const purchaseDays = new Set<number>();

  for (const e of events) {
    const ms = e.createdAt.getTime();
    if (e.delta > 0) {
      totalIn += e.delta;
      lastBoughtAt = ms;
      purchaseDays.add(Math.floor(ms / DAY_MS));
    } else {
      totalOut += -e.delta;
    }
  }

  /* Average gap between distinct purchase days. */
  let avgIntervalDays: number | null = null;
  const days = [...purchaseDays].sort((a, b) => a - b);
  if (days.length >= 2) {
    let sum = 0;
    for (let i = 1; i < days.length; i++) sum += days[i]! - days[i - 1]!;
    avgIntervalDays = sum / (days.length - 1);
  }

  /* Consumption rate per week over the observed lifespan. */
  let avgWeeklyUse: number | null = null;
  const first = events[0]!.createdAt.getTime();
  const spanWeeks = Math.max((Date.now() - first) / WEEK_MS, 1 / 7);
  if (totalOut > 0) avgWeeklyUse = totalOut / spanWeeks;

  const suggestedThreshold =
    avgWeeklyUse !== null ? Math.max(1, Math.round(avgWeeklyUse)) : null;

  return {
    totalIn,
    totalOut,
    lastBoughtAt,
    purchaseOccasions: purchaseDays.size,
    avgIntervalDays,
    avgWeeklyUse,
    suggestedThreshold,
  };
}

export type ItemEvent = {
  id: number;
  delta: number;
  source: string;
  createdAt: number;
  expiryDate: number | null;
};

/** Most recent events for the item's activity feed. */
export function recentEvents(itemId: number, limit = 12): ItemEvent[] {
  return db
    .select({
      id: schema.stockEvents.id,
      delta: schema.stockEvents.delta,
      source: schema.stockEvents.source,
      createdAt: schema.stockEvents.createdAt,
      expiryDate: schema.stockEvents.expiryDate,
    })
    .from(schema.stockEvents)
    .where(eq(schema.stockEvents.itemId, itemId))
    .orderBy(desc(schema.stockEvents.createdAt), desc(schema.stockEvents.id))
    .limit(limit)
    .all()
    .map((e) => ({
      id: e.id,
      delta: e.delta,
      source: e.source,
      createdAt: e.createdAt.getTime(),
      expiryDate: e.expiryDate ? e.expiryDate.getTime() : null,
    }));
}
