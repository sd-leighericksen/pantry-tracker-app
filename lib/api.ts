import "server-only";

import { desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { listInventoryItems } from "@/lib/inventory";
import { listShoppingList } from "@/lib/shopping";
import { getItem } from "@/lib/items";

/* ------------------------------------------------------------------ *
 * DTOs for the REST API (BRIEF §5.7). Shapes are deliberately flat and
 * stable so n8n / Home Assistant can bind to them.
 * ------------------------------------------------------------------ */

/** Counts + the shopping list for Home Assistant RESTful sensors. */
export function apiStats() {
  const inventory = listInventoryItems();
  const shopping = listShoppingList().filter((s) => s.status === "pending");
  return {
    shoppingCount: shopping.length,
    lowStockCount: inventory.filter((i) => i.lowStock).length,
    expiringCount: inventory.filter((i) => i.expired || i.expiringSoon).length,
    expiredCount: inventory.filter((i) => i.expired).length,
    shoppingList: shopping.map((s) => s.name),
  };
}

export function apiInventory() {
  return listInventoryItems().map((i) => ({
    id: i.id,
    name: i.name,
    brand: i.brand,
    category: i.categoryName,
    quantity: i.quantity,
    threshold: i.threshold,
    nutriscore: i.nutriscore,
    lowStock: i.lowStock,
    expiringSoon: i.expiringSoon,
    expired: i.expired,
  }));
}

/** Full single-item detail for agents (incl nutrition/ingredients/allergens). */
export function apiItemDetail(id: number) {
  const it = getItem(id);
  if (!it) return null;
  return {
    id: it.id,
    name: it.name,
    brand: it.brand,
    category: it.categoryName,
    categoryId: it.categoryId,
    quantity: it.quantity,
    threshold: it.threshold,
    lowStock: it.threshold > 0 && it.quantity <= it.threshold,
    size: it.sizeText,
    nutriscore: it.nutriscore,
    nova: it.nova,
    nutriments: it.nutriments,
    ingredients: it.ingredients,
    allergens: it.allergens,
    defaultShelfLifeDays: it.defaultShelfLifeDays,
    notes: it.notes,
    barcodes: it.barcodes,
    storeIds: it.storeIds,
  };
}

export function apiShopping() {
  return listShoppingList().map((s) => ({
    id: s.id,
    name: s.name,
    itemId: s.itemId,
    status: s.status,
    store: s.groupStoreName,
  }));
}

export function apiEvents(limit = 50) {
  return db
    .select({
      id: schema.stockEvents.id,
      itemId: schema.stockEvents.itemId,
      name: schema.items.name,
      delta: schema.stockEvents.delta,
      source: schema.stockEvents.source,
      createdAt: schema.stockEvents.createdAt,
    })
    .from(schema.stockEvents)
    .innerJoin(schema.items, eq(schema.stockEvents.itemId, schema.items.id))
    .orderBy(desc(schema.stockEvents.createdAt), desc(schema.stockEvents.id))
    .limit(limit)
    .all()
    .map((e) => ({
      id: e.id,
      itemId: e.itemId,
      name: e.name,
      delta: e.delta,
      source: e.source,
      at: e.createdAt.toISOString(),
    }));
}
