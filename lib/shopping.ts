import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { dispatch } from "@/lib/webhooks";

/* ------------------------------------------------------------------ *
 * Shopping list (BRIEF §5.5). Rows are either an item reference or a
 * free-text one-off. Auto-added rows arrive via lib/stock.ts on threshold
 * crossings. Grouping store is the row's own store, else the item's
 * preferred store, else its first available store.
 *
 * "Complete shop" only clears ticked rows — stock is never incremented
 * here; that happens when items are physically scanned in (decision §10.2).
 * ------------------------------------------------------------------ */

export type ShoppingStatus = "pending" | "ticked";

export type ShoppingEntry = {
  id: number;
  itemId: number | null;
  name: string;
  status: ShoppingStatus;
  /** Quantity still needed, shown only when > 1. */
  needed: number | null;
  groupStoreId: number | null;
  groupStoreName: string;
  groupStoreColour: string | null;
  /** Other stores the item is sold at, for the "also at" badge. */
  altStoreNames: string[];
};

const UNASSIGNED = "Unassigned";

export function listShoppingList(): ShoppingEntry[] {
  const rows = db
    .select({
      id: schema.shoppingList.id,
      itemId: schema.shoppingList.itemId,
      freeText: schema.shoppingList.freeText,
      rowStoreId: schema.shoppingList.storeId,
      status: schema.shoppingList.status,
      createdAt: schema.shoppingList.createdAt,
      itemName: schema.items.name,
      preferredStoreId: schema.items.preferredStoreId,
      quantity: schema.items.quantity,
      threshold: schema.items.threshold,
    })
    .from(schema.shoppingList)
    .leftJoin(schema.items, eq(schema.shoppingList.itemId, schema.items.id))
    .orderBy(desc(schema.shoppingList.createdAt))
    .all();

  const stores = new Map(
    db
      .select({
        id: schema.stores.id,
        name: schema.stores.name,
        colour: schema.stores.colour,
      })
      .from(schema.stores)
      .all()
      .map((s) => [s.id, s]),
  );

  /* Store associations for every item referenced on the list. */
  const storesByItem = new Map<number, number[]>();
  for (const { itemId, storeId } of db
    .select({
      itemId: schema.itemStores.itemId,
      storeId: schema.itemStores.storeId,
    })
    .from(schema.itemStores)
    .all()) {
    const list = storesByItem.get(itemId);
    if (list) list.push(storeId);
    else storesByItem.set(itemId, [storeId]);
  }

  return rows.map((r) => {
    const itemStores = r.itemId ? (storesByItem.get(r.itemId) ?? []) : [];
    const groupStoreId =
      r.rowStoreId ?? r.preferredStoreId ?? itemStores[0] ?? null;
    const groupStore = groupStoreId ? stores.get(groupStoreId) : undefined;

    const needed =
      r.threshold !== null &&
      r.quantity !== null &&
      r.threshold > r.quantity &&
      r.threshold - r.quantity > 1
        ? r.threshold - r.quantity
        : null;

    const altStoreNames = itemStores
      .filter((id) => id !== groupStoreId)
      .map((id) => stores.get(id)?.name)
      .filter((n): n is string => Boolean(n));

    return {
      id: r.id,
      itemId: r.itemId,
      name: r.itemName ?? r.freeText ?? "Item",
      status: r.status as ShoppingStatus,
      needed,
      groupStoreId,
      groupStoreName: groupStore?.name ?? UNASSIGNED,
      groupStoreColour: groupStore?.colour ?? null,
      altStoreNames,
    };
  });
}

/* ------------------------------ mutations ---------------------------- */

export function addFreeTextItem(text: string, storeId: number | null): void {
  db.insert(schema.shoppingList)
    .values({ freeText: text, storeId, status: "pending", addedBy: "manual" })
    .run();
  dispatch("shopping.item_added", { name: text, source: "manual" });
}

export function setTicked(id: number, ticked: boolean): void {
  db.update(schema.shoppingList)
    .set({
      status: ticked ? "ticked" : "pending",
      tickedAt: ticked ? new Date() : null,
    })
    .where(eq(schema.shoppingList.id, id))
    .run();
}

export function removeShoppingItem(id: number): void {
  db.delete(schema.shoppingList).where(eq(schema.shoppingList.id, id)).run();
}

/** Clear ticked rows ("complete shop"). Returns how many were cleared. */
export function completeShop(): number {
  const res = db
    .delete(schema.shoppingList)
    .where(eq(schema.shoppingList.status, "ticked"))
    .run();
  dispatch("shop.completed", { cleared: res.changes });
  return res.changes;
}

/** Add an item to the list manually (deduped against an existing pending row). */
export function addItemToList(itemId: number): void {
  const existing = db
    .select({ id: schema.shoppingList.id })
    .from(schema.shoppingList)
    .where(
      and(
        eq(schema.shoppingList.itemId, itemId),
        eq(schema.shoppingList.status, "pending"),
      ),
    )
    .get();
  if (existing) return;

  const row = db
    .insert(schema.shoppingList)
    .values({ itemId, status: "pending", addedBy: "manual" })
    .onConflictDoNothing()
    .returning({ id: schema.shoppingList.id })
    .get();
  if (!row) return;

  const item = db
    .select({ name: schema.items.name })
    .from(schema.items)
    .where(eq(schema.items.id, itemId))
    .get();
  dispatch("shopping.item_added", {
    itemId,
    name: item?.name ?? "",
    source: "manual",
  });
}
