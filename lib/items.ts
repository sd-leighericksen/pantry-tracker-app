import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { OffProduct } from "@/lib/off-client";
import { parseNutriments, type Nutriments } from "@/lib/nutrition";

/* ------------------------------------------------------------------ *
 * Item creation. Items enter the catalogue here; quantity is never set
 * directly (it starts at 0 and only moves through lib/stock.ts).
 * ------------------------------------------------------------------ */

export type CreatedItem = { id: number; name: string };

/**
 * Create an item from a normalised OFF product, mapping the columns the app
 * stores and keeping the full OFF payload verbatim in off_data for future
 * re-mapping (skill: store raw as well as mapped). Maps both OFF's canonical
 * barcode and the scanned code (if different) to the new item.
 */
export function createItemFromOff(
  off: OffProduct,
  opts: { categoryId: number; threshold?: number; photo?: string | null; scanned?: string },
): CreatedItem {
  return db.transaction((tx) => {
    const name = off.name ?? "Unnamed product";

    const item = tx
      .insert(schema.items)
      .values({
        name,
        brand: off.brand,
        categoryId: opts.categoryId,
        photo: opts.photo ?? null,
        threshold: opts.threshold ?? 0,
        nutriscore: off.nutriscore,
        nova: off.nova,
        sizeText: off.sizeText,
        ingredients: off.ingredients,
        allergens: off.allergens,
        nutriments: off.nutriments ? JSON.stringify(off.nutriments) : null,
        offData: JSON.stringify(off.raw),
      })
      .returning({ id: schema.items.id })
      .get();

    const codes = new Set([off.barcode]);
    if (opts.scanned) codes.add(opts.scanned);
    for (const barcode of codes) {
      tx.insert(schema.barcodes)
        .values({ barcode, itemId: item.id })
        .onConflictDoNothing()
        .run();
    }

    return { id: item.id, name };
  });
}

/* ------------------------------- lists ------------------------------- */

export type CategoryOption = { id: number; name: string };
export type StoreOption = { id: number; name: string; colour: string };

export function listCategories(): CategoryOption[] {
  return db
    .select({ id: schema.categories.id, name: schema.categories.name })
    .from(schema.categories)
    .orderBy(asc(schema.categories.sort), asc(schema.categories.name))
    .all();
}

export function createCategory(name: string): void {
  const count = db.select().from(schema.categories).all().length;
  db.insert(schema.categories).values({ name, sort: count }).run();
}

export function renameCategory(id: number, name: string): void {
  db.update(schema.categories)
    .set({ name })
    .where(eq(schema.categories.id, id))
    .run();
}

/** How many items reference this category (blocks deletion when > 0). */
export function categoryItemCount(id: number): number {
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(schema.items)
      .where(eq(schema.items.categoryId, id))
      .get()?.n ?? 0
  );
}

export function deleteCategory(id: number): void {
  db.delete(schema.categories).where(eq(schema.categories.id, id)).run();
}

export function listStores(): StoreOption[] {
  return db
    .select({
      id: schema.stores.id,
      name: schema.stores.name,
      colour: schema.stores.colour,
    })
    .from(schema.stores)
    .orderBy(asc(schema.stores.sort), asc(schema.stores.name))
    .all();
}

export function createStore(name: string, colour: string): void {
  const count = db.select().from(schema.stores).all().length;
  db.insert(schema.stores).values({ name, colour, sort: count }).run();
}

/**
 * Delete a store, first detaching it from items and shopping rows so the
 * foreign keys don't block the delete (item_stores cascades on its own).
 */
export function deleteStore(id: number): void {
  db.transaction((tx) => {
    tx.update(schema.items)
      .set({ preferredStoreId: null })
      .where(eq(schema.items.preferredStoreId, id))
      .run();
    tx.update(schema.shoppingList)
      .set({ storeId: null })
      .where(eq(schema.shoppingList.storeId, id))
      .run();
    tx.delete(schema.stores).where(eq(schema.stores.id, id)).run();
  });
}

/* --------------------------- manual creation ------------------------- */

export type ManualItemInput = {
  name: string;
  brand?: string | null;
  categoryId: number;
  threshold?: number;
  defaultShelfLifeDays?: number | null;
  notes?: string | null;
  storeIds?: number[];
  preferredStoreId?: number | null;
  barcode?: string | null;
  pinned?: boolean;
  icon?: string | null;
  photo?: string | null;
  sizeText?: string | null;
  ingredients?: string | null;
  allergens?: string | null;
  /** JSON-encoded Nutriments, or null. */
  nutriments?: string | null;
};

/**
 * Create an item from the manual entry form (BRIEF §5.2 path 3). Inserts the
 * item, an optional barcode, and the many-to-many store availability in one
 * transaction. Quantity starts at 0 — stock only moves through lib/stock.ts.
 */
export function createItemManual(input: ManualItemInput): CreatedItem {
  return db.transaction((tx) => {
    const storeIds = input.storeIds ?? [];
    /* Preferred store must be one the item is actually sold at. */
    const preferredStoreId =
      input.preferredStoreId && storeIds.includes(input.preferredStoreId)
        ? input.preferredStoreId
        : (storeIds[0] ?? null);

    const item = tx
      .insert(schema.items)
      .values({
        name: input.name,
        brand: input.brand ?? null,
        categoryId: input.categoryId,
        threshold: input.threshold ?? 0,
        defaultShelfLifeDays: input.defaultShelfLifeDays ?? null,
        notes: input.notes ?? null,
        preferredStoreId,
        pinned: input.pinned ?? false,
        icon: input.icon ?? null,
        photo: input.photo ?? null,
        sizeText: input.sizeText ?? null,
        ingredients: input.ingredients ?? null,
        allergens: input.allergens ?? null,
        nutriments: input.nutriments ?? null,
      })
      .returning({ id: schema.items.id })
      .get();

    if (input.barcode) {
      tx.insert(schema.barcodes)
        .values({ barcode: input.barcode, itemId: item.id })
        .onConflictDoNothing()
        .run();
    }

    for (const storeId of new Set(storeIds)) {
      tx.insert(schema.itemStores)
        .values({ itemId: item.id, storeId })
        .onConflictDoNothing()
        .run();
    }

    return { id: item.id, name: input.name };
  });
}

/**
 * The default category for items created without an explicit one (e.g. a
 * quick OFF resolve on the kiosk). Uses the lowest-sort seeded category, or
 * creates "Uncategorised" if the catalogue is empty.
 */
export function ensureDefaultCategoryId(): number {
  const first = db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .orderBy(asc(schema.categories.sort), asc(schema.categories.id))
    .get();
  if (first) return first.id;

  const created = db
    .insert(schema.categories)
    .values({ name: "Uncategorised" })
    .returning({ id: schema.categories.id })
    .get();
  return created.id;
}

/** Look up the item id a barcode currently maps to, if any. */
export function itemIdForBarcode(barcode: string): number | null {
  const row = db
    .select({ itemId: schema.barcodes.itemId })
    .from(schema.barcodes)
    .where(eq(schema.barcodes.barcode, barcode))
    .get();
  return row?.itemId ?? null;
}

/* ------------------------------ detail ------------------------------- */

export type ItemDetail = {
  id: number;
  name: string;
  brand: string | null;
  categoryId: number;
  categoryName: string;
  quantity: number;
  threshold: number;
  defaultShelfLifeDays: number | null;
  notes: string | null;
  nutriscore: string | null;
  nova: number | null;
  photo: string | null;
  pinned: boolean;
  icon: string | null;
  sizeText: string | null;
  ingredients: string | null;
  allergens: string | null;
  nutriments: Nutriments | null;
  preferredStoreId: number | null;
  storeIds: number[];
  barcodes: string[];
};

export function getItem(id: number): ItemDetail | null {
  const row = db
    .select({
      id: schema.items.id,
      name: schema.items.name,
      brand: schema.items.brand,
      categoryId: schema.items.categoryId,
      categoryName: schema.categories.name,
      quantity: schema.items.quantity,
      threshold: schema.items.threshold,
      defaultShelfLifeDays: schema.items.defaultShelfLifeDays,
      notes: schema.items.notes,
      nutriscore: schema.items.nutriscore,
      nova: schema.items.nova,
      photo: schema.items.photo,
      pinned: schema.items.pinned,
      icon: schema.items.icon,
      sizeText: schema.items.sizeText,
      ingredients: schema.items.ingredients,
      allergens: schema.items.allergens,
      nutriments: schema.items.nutriments,
      preferredStoreId: schema.items.preferredStoreId,
    })
    .from(schema.items)
    .innerJoin(schema.categories, eq(schema.items.categoryId, schema.categories.id))
    .where(and(eq(schema.items.id, id), isNull(schema.items.archivedAt)))
    .get();
  if (!row) return null;

  const storeIds = db
    .select({ storeId: schema.itemStores.storeId })
    .from(schema.itemStores)
    .where(eq(schema.itemStores.itemId, id))
    .all()
    .map((r) => r.storeId);

  const barcodes = db
    .select({ barcode: schema.barcodes.barcode })
    .from(schema.barcodes)
    .where(eq(schema.barcodes.itemId, id))
    .all()
    .map((r) => r.barcode);

  return { ...row, nutriments: parseNutriments(row.nutriments), storeIds, barcodes };
}

export type ItemPatch = {
  name: string;
  brand: string | null;
  categoryId: number;
  threshold: number;
  defaultShelfLifeDays: number | null;
  notes: string | null;
  pinned: boolean;
  icon: string | null;
  sizeText: string | null;
  storeIds: number[];
  preferredStoreId: number | null;
};

/** Update editable fields and replace the store associations. */
export function updateItem(id: number, patch: ItemPatch): void {
  db.transaction((tx) => {
    const preferredStoreId =
      patch.preferredStoreId && patch.storeIds.includes(patch.preferredStoreId)
        ? patch.preferredStoreId
        : (patch.storeIds[0] ?? null);

    tx.update(schema.items)
      .set({
        name: patch.name,
        brand: patch.brand,
        categoryId: patch.categoryId,
        threshold: patch.threshold,
        defaultShelfLifeDays: patch.defaultShelfLifeDays,
        notes: patch.notes,
        pinned: patch.pinned,
        icon: patch.icon,
        sizeText: patch.sizeText,
        preferredStoreId,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(schema.items.id, id))
      .run();

    tx.delete(schema.itemStores).where(eq(schema.itemStores.itemId, id)).run();
    for (const storeId of new Set(patch.storeIds)) {
      tx.insert(schema.itemStores).values({ itemId: id, storeId }).run();
    }
  });
}

/**
 * Refresh an item's OFF-sourced fields from a fresh lookup (the manual
 * "refresh from OFF" path the skill anticipates). Updates product info only —
 * name, category, quantity, threshold, stores, notes and pinned are left as
 * the user set them. `photo` is the freshly-cached path (or current, to keep).
 */
export function updateItemFromOff(
  itemId: number,
  off: OffProduct,
  photo: string | null,
): void {
  db.update(schema.items)
    .set({
      brand: off.brand,
      sizeText: off.sizeText,
      nutriscore: off.nutriscore,
      nova: off.nova,
      ingredients: off.ingredients,
      allergens: off.allergens,
      nutriments: off.nutriments ? JSON.stringify(off.nutriments) : null,
      photo,
      offData: JSON.stringify(off.raw),
      updatedAt: sql`(unixepoch())`,
    })
    .where(eq(schema.items.id, itemId))
    .run();
}

/** Add a barcode alias to an item (packaging redesign, §10.1). */
export function addBarcodeToItem(itemId: number, barcode: string): void {
  db.insert(schema.barcodes)
    .values({ barcode, itemId })
    .onConflictDoNothing()
    .run();
}

export function removeBarcodeFromItem(barcode: string): void {
  db.delete(schema.barcodes).where(eq(schema.barcodes.barcode, barcode)).run();
}

/** Soft-delete an item. */
export function archiveItem(id: number): void {
  db.update(schema.items)
    .set({ archivedAt: new Date() })
    .where(eq(schema.items.id, id))
    .run();
}
