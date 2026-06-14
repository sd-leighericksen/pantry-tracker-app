import "server-only";

import { asc, eq, isNull } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { expiryStatusByItem } from "@/lib/expiry";

/* ------------------------------------------------------------------ *
 * Inventory listing (BRIEF §5.3). Single-household datasets are small, so
 * we fetch the whole catalogue and let the client filter/search in memory
 * rather than round-tripping per keystroke.
 * ------------------------------------------------------------------ */

export type InventoryItem = {
  id: number;
  name: string;
  brand: string | null;
  photo: string | null;
  categoryId: number;
  categoryName: string;
  quantity: number;
  threshold: number;
  nutriscore: string | null;
  nova: number | null;
  /** quantity at or below a non-zero threshold. */
  lowStock: boolean;
  storeIds: number[];
  /** Has on-hand stock already past its expiry. */
  expired: boolean;
  /** Has on-hand stock expiring within the Use Soon window. */
  expiringSoon: boolean;
};

export function listInventoryItems(): InventoryItem[] {
  const rows = db
    .select({
      id: schema.items.id,
      name: schema.items.name,
      brand: schema.items.brand,
      photo: schema.items.photo,
      categoryId: schema.items.categoryId,
      categoryName: schema.categories.name,
      quantity: schema.items.quantity,
      threshold: schema.items.threshold,
      nutriscore: schema.items.nutriscore,
      nova: schema.items.nova,
    })
    .from(schema.items)
    .innerJoin(schema.categories, eq(schema.items.categoryId, schema.categories.id))
    .where(isNull(schema.items.archivedAt))
    .orderBy(asc(schema.items.name))
    .all();

  /* One pass for store associations, grouped by item. */
  const storeRows = db
    .select({
      itemId: schema.itemStores.itemId,
      storeId: schema.itemStores.storeId,
    })
    .from(schema.itemStores)
    .all();

  const storesByItem = new Map<number, number[]>();
  for (const { itemId, storeId } of storeRows) {
    const list = storesByItem.get(itemId);
    if (list) list.push(storeId);
    else storesByItem.set(itemId, [storeId]);
  }

  const expiry = expiryStatusByItem();

  return rows.map((r) => ({
    ...r,
    lowStock: r.threshold > 0 && r.quantity <= r.threshold,
    storeIds: storesByItem.get(r.id) ?? [],
    expired: expiry.get(r.id)?.expired ?? false,
    expiringSoon: expiry.get(r.id)?.expiringSoon ?? false,
  }));
}
