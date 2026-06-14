import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { listUseSoon } from "@/lib/expiry";
import { getSetting, setSetting } from "@/lib/settings";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/webhook-events";

/* ------------------------------------------------------------------ *
 * Outbound webhooks (BRIEF §5.7). User-configured URLs receive a simple
 * JSON envelope on events — designed to drop straight into n8n. Delivery
 * is fire-and-forget: it must never block or fail the triggering action.
 * ------------------------------------------------------------------ */

export { WEBHOOK_EVENTS, type WebhookEvent };

export type Webhook = {
  id: number;
  eventType: string;
  url: string;
  enabled: boolean;
  createdAt: Date;
};

/* ------------------------------- CRUD -------------------------------- */

export function listWebhooks(): Webhook[] {
  return db
    .select()
    .from(schema.webhooks)
    .orderBy(desc(schema.webhooks.createdAt))
    .all();
}

export function createWebhook(eventType: string, url: string): void {
  db.insert(schema.webhooks).values({ eventType, url }).run();
}

export function setWebhookEnabled(id: number, enabled: boolean): void {
  db.update(schema.webhooks)
    .set({ enabled })
    .where(eq(schema.webhooks.id, id))
    .run();
}

export function deleteWebhook(id: number): void {
  db.delete(schema.webhooks).where(eq(schema.webhooks.id, id)).run();
}

export function getWebhook(id: number): Webhook | undefined {
  return db
    .select()
    .from(schema.webhooks)
    .where(eq(schema.webhooks.id, id))
    .get();
}

/* ----------------------------- delivery ------------------------------ */

/**
 * Fire an event to every enabled webhook subscribed to it (exact event or the
 * "all" wildcard). Fire-and-forget — returns immediately; failures are
 * swallowed so a triggering mutation is never affected.
 */
export function dispatch(event: WebhookEvent, data: unknown): void {
  void deliver(event, data);
}

async function deliver(event: WebhookEvent, data: unknown): Promise<void> {
  const urls = db
    .select({ url: schema.webhooks.url })
    .from(schema.webhooks)
    .where(
      and(
        eq(schema.webhooks.enabled, true),
        inArray(schema.webhooks.eventType, [event, "all"]),
      ),
    )
    .all()
    .map((h) => h.url);

  if (urls.length === 0) return;

  const body = JSON.stringify({ event, at: new Date().toISOString(), data });
  await Promise.allSettled(
    urls.map((url) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(5000),
      }),
    ),
  );
}

/* ----------------------- expiry notifications ------------------------ */

const NOTIFIED_KEY = "expiry_notified";

/**
 * Fire `item.expiring_soon` for items newly inside the Use Soon window.
 * Time-based, so it's triggered externally (cron / n8n / HA hitting
 * /api/v1/cron/expiry-check), not on a mutation. Dedupes on item+expiry-day
 * via settings so the same lot isn't announced twice. Returns count fired.
 */
export function runExpiryNotifications(): number {
  const soon = listUseSoon().filter((e) => !e.expired);

  let notified: string[];
  try {
    notified = JSON.parse(getSetting(NOTIFIED_KEY) ?? "[]") as string[];
  } catch {
    notified = [];
  }
  const seen = new Set(notified);

  let fired = 0;
  const stillRelevant = new Set<string>();
  for (const e of soon) {
    const key = `${e.itemId}:${Math.floor(e.expiry / 86_400_000)}`;
    stillRelevant.add(key);
    if (seen.has(key)) continue;
    dispatch("item.expiring_soon", {
      itemId: e.itemId,
      name: e.name,
      quantity: e.quantity,
      daysLeft: e.daysLeft,
    });
    fired += 1;
  }

  /* Persist only keys still in-window, so past lots can re-notify later. */
  const next = [...new Set([...notified, ...stillRelevant])].filter((k) =>
    stillRelevant.has(k),
  );
  setSetting(NOTIFIED_KEY, JSON.stringify(next));
  return fired;
}

/** Send a one-off test payload to a single webhook URL. */
export async function testWebhook(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "test",
        at: new Date().toISOString(),
        data: { message: "Pantry Tracker test webhook" },
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
