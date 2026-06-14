import "server-only";

import { and, eq, gt, isNull, lte, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { listUseSoon } from "@/lib/expiry";

/* ------------------------------------------------------------------ *
 * Reports (BRIEF §5.6). Aggregates over the append-only event log and the
 * current item snapshot. Single-household scale → compute in JS.
 * ------------------------------------------------------------------ */

export type MonthVolume = { key: string; label: string; in: number; out: number };

/** In/out unit volumes for the last `months` calendar months, oldest first. */
export function monthlyVolumes(months = 6): MonthVolume[] {
  const events = db
    .select({
      delta: schema.stockEvents.delta,
      createdAt: schema.stockEvents.createdAt,
    })
    .from(schema.stockEvents)
    .all();

  const totals = new Map<string, { in: number; out: number }>();
  for (const e of events) {
    const d = e.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = totals.get(key) ?? { in: 0, out: 0 };
    if (e.delta > 0) bucket.in += e.delta;
    else bucket.out += -e.delta;
    totals.set(key, bucket);
  }

  const out: MonthVolume[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = totals.get(key) ?? { in: 0, out: 0 };
    out.push({
      key,
      label: d.toLocaleDateString("en-AU", { month: "short" }),
      in: bucket.in,
      out: bucket.out,
    });
  }
  return out;
}

export type MostUsedItem = {
  id: number;
  name: string;
  photo: string | null;
  used: number;
};

/** Items ranked by total units consumed (all time). */
export function mostUsed(limit = 8): MostUsedItem[] {
  const events = db
    .select({
      itemId: schema.stockEvents.itemId,
      delta: schema.stockEvents.delta,
    })
    .from(schema.stockEvents)
    .all();

  const used = new Map<number, number>();
  for (const e of events) {
    if (e.delta < 0) used.set(e.itemId, (used.get(e.itemId) ?? 0) - e.delta);
  }
  if (used.size === 0) return [];

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

  return [...used.entries()]
    .map(([id, n]) => ({ id, used: n, item: items.get(id) }))
    .filter((r) => r.item && !r.item.archivedAt)
    .sort((a, b) => b.used - a.used)
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      name: r.item!.name,
      photo: r.item!.photo,
      used: r.used,
    }));
}

export type WastedItem = {
  id: number;
  name: string;
  photo: string | null;
  wasted: number;
};

/** Items ranked by units explicitly scanned out as wasted (source "waste"). */
export function mostWasted(limit = 8): WastedItem[] {
  const rows = db
    .select({
      itemId: schema.stockEvents.itemId,
      delta: schema.stockEvents.delta,
    })
    .from(schema.stockEvents)
    .where(eq(schema.stockEvents.source, "waste"))
    .all();

  const wasted = new Map<number, number>();
  for (const r of rows) wasted.set(r.itemId, (wasted.get(r.itemId) ?? 0) - r.delta);
  if (wasted.size === 0) return [];

  const items = new Map(
    db
      .select({
        id: schema.items.id,
        name: schema.items.name,
        photo: schema.items.photo,
      })
      .from(schema.items)
      .all()
      .map((i) => [i.id, i]),
  );

  return [...wasted.entries()]
    .map(([id, n]) => ({ id, wasted: n, item: items.get(id) }))
    .filter((r) => r.item)
    .sort((a, b) => b.wasted - a.wasted)
    .slice(0, limit)
    .map((r) => ({ id: r.id, name: r.item!.name, photo: r.item!.photo, wasted: r.wasted }));
}

export type WasteItem = {
  itemId: number;
  name: string;
  quantity: number;
  daysExpired: number;
};

/**
 * Waste log: stock that's expired but still on hand (BRIEF §5.6 "items that
 * expired unused"). Derived from the current expired lots. Without disposal
 * events this is "expired on hand", which is the actionable view.
 */
export function wasteLog(): WasteItem[] {
  return listUseSoon(0)
    .filter((e) => e.expired)
    .map((e) => ({
      itemId: e.itemId,
      name: e.name,
      quantity: e.quantity,
      daysExpired: -e.daysLeft,
    }));
}

export type GradeCount = {
  grade: "a" | "b" | "c" | "d" | "e" | "unrated";
  count: number;
};

/** "Health of our pantry": in-stock items grouped by Nutri-Score grade. */
export function pantryHealth(): GradeCount[] {
  const rows = db
    .select({ nutriscore: schema.items.nutriscore })
    .from(schema.items)
    .where(and(gt(schema.items.quantity, 0), isNull(schema.items.archivedAt)))
    .all();

  const counts: Record<GradeCount["grade"], number> = {
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    e: 0,
    unrated: 0,
  };
  for (const r of rows) {
    const g = r.nutriscore?.toLowerCase();
    if (g === "a" || g === "b" || g === "c" || g === "d" || g === "e") {
      counts[g] += 1;
    } else {
      counts.unrated += 1;
    }
  }

  return (["a", "b", "c", "d", "e", "unrated"] as const).map((grade) => ({
    grade,
    count: counts[grade],
  }));
}

/* Best-effort parse of a free-text size ("1 kg", "650 ml", "320 g, 500 mL")
 * into grams + millilitres. Ordered alternation so kg/ml win over g/l. */
function parseSize(s: string): { grams: number; ml: number } {
  const t = s.toLowerCase();
  let grams = 0;
  let ml = 0;
  const mass = /(\d+(?:\.\d+)?)\s*(kg|mg|g)\b/.exec(t);
  if (mass) {
    const n = parseFloat(mass[1]!);
    grams = mass[2] === "kg" ? n * 1000 : mass[2] === "mg" ? n / 1000 : n;
  }
  const vol = /(\d+(?:\.\d+)?)\s*(ml|cl|l)\b/.exec(t);
  if (vol) {
    const n = parseFloat(vol[1]!);
    ml = vol[2] === "l" ? n * 1000 : vol[2] === "cl" ? n * 10 : n;
  }
  return { grams, ml };
}

export type MassVolume = { grams: number; millilitres: number };
export type FlowTotals = {
  broughtIn: MassVolume;
  consumed: MassVolume;
  wasted: MassVolume;
};

/* "Used" outflow — eaten/used normally (vs wasted vs manual corrections). */
const CONSUMED_SOURCES = new Set(["scan-out", "quick-use"]);

/**
 * Mass/volume totals by flow: brought in (positive events), consumed (used
 * outflows) and wasted (waste outflows) = per-unit size × units, across items
 * with a parseable size. A fun stat, not an audit — free-text size and items
 * without a size simply don't count.
 */
export function flowTotals(): FlowTotals {
  const sizes = new Map<number, MassVolume>();
  for (const it of db
    .select({ id: schema.items.id, sizeText: schema.items.sizeText })
    .from(schema.items)
    .all()) {
    if (!it.sizeText) continue;
    const { grams, ml } = parseSize(it.sizeText);
    if (grams || ml) sizes.set(it.id, { grams, millilitres: ml });
  }

  const totals: FlowTotals = {
    broughtIn: { grams: 0, millilitres: 0 },
    consumed: { grams: 0, millilitres: 0 },
    wasted: { grams: 0, millilitres: 0 },
  };

  for (const e of db
    .select({
      itemId: schema.stockEvents.itemId,
      delta: schema.stockEvents.delta,
      source: schema.stockEvents.source,
    })
    .from(schema.stockEvents)
    .all()) {
    const sz = sizes.get(e.itemId);
    if (!sz) continue;
    if (e.delta > 0) {
      totals.broughtIn.grams += sz.grams * e.delta;
      totals.broughtIn.millilitres += sz.millilitres * e.delta;
      continue;
    }
    const units = -e.delta;
    const bucket =
      e.source === "waste"
        ? totals.wasted
        : CONSUMED_SOURCES.has(e.source)
          ? totals.consumed
          : null;
    if (bucket) {
      bucket.grams += sz.grams * units;
      bucket.millilitres += sz.millilitres * units;
    }
  }
  return totals;
}

function lowStockCount(): number {
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.items)
    .where(
      and(
        isNull(schema.items.archivedAt),
        gt(schema.items.threshold, 0),
        lte(schema.items.quantity, schema.items.threshold),
      ),
    )
    .get();
  return row?.n ?? 0;
}

/** Compact, factual snapshot fed to the AI monthly-summary prompt. */
export function summaryInput() {
  const months = monthlyVolumes(2);
  const health = pantryHealth();
  const gradeCounts = Object.fromEntries(health.map((g) => [g.grade, g.count]));
  return {
    period: new Date().toLocaleDateString("en-AU", {
      month: "long",
      year: "numeric",
    }),
    thisMonth: months.at(-1) ?? { in: 0, out: 0 },
    lastMonth: months.at(-2) ?? { in: 0, out: 0 },
    mostUsed: mostUsed(5).map((m) => ({ name: m.name, used: m.used })),
    expiredOnHand: wasteLog().map((w) => ({
      name: w.name,
      quantity: w.quantity,
      daysExpired: w.daysExpired,
    })),
    pantryHealth: gradeCounts,
    lowStockCount: lowStockCount(),
  };
}

export type SummaryInput = ReturnType<typeof summaryInput>;
