"use server";

import { getCurrentUser } from "@/lib/auth";
import { resolveScan, type ScanMode, type ScanResult } from "@/lib/scan";
import { cacheProductImage, lookupBarcode } from "@/lib/off-client";
import {
  createItemFromOff,
  ensureDefaultCategoryId,
  itemIdForBarcode,
  listCategories,
} from "@/lib/items";
import { adjustStock, type StockSource } from "@/lib/stock";
import { suggestCategory } from "@/lib/ai";

/**
 * Server action invoked on every committed scan. Re-checks auth (defence in
 * depth beyond middleware), then resolves the barcode against the local DB.
 */
export async function submitScan(
  barcode: string,
  mode: ScanMode,
): Promise<ScanResult> {
  const user = await getCurrentUser();
  if (!user) {
    /* The kiosk shell only renders behind auth, so this is a guard, not a
     * user-facing path — report it as an invalid scan. */
    return { status: "invalid", barcode };
  }
  return resolveScan(barcode, mode);
}

export type ResolveResult =
  | {
      status: "created";
      item: { id: number; name: string };
      existed: boolean;
      quantity: number;
    }
  | { status: "not-found" }
  | { status: "error"; message: string };

/**
 * Resolve an unknown barcode via Open Food Facts (now run automatically on
 * scan, not as a separate step). On a hit, create the item so it's
 * immediately scannable. When `incoming` (scanned in), also +1 the quantity
 * through the stock path — a scanned-in item should land at 1, not 0. A miss
 * is the normal route to manual entry, not an error.
 */
export async function resolveUnknown(
  barcode: string,
  incoming = false,
): Promise<ResolveResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "unauthorised" };

  /* Already resolved (e.g. scanned twice)? Don't duplicate — just count the
   * incoming unit. delta 0 returns the current quantity without an event. */
  const existingItem = itemIdForBarcode(barcode);
  if (existingItem !== null) {
    const adj = adjustStock(existingItem, incoming ? 1 : 0, "scan-in");
    return {
      status: "created",
      item: { id: existingItem, name: "" },
      existed: true,
      quantity: adj.quantity,
    };
  }

  const result = await lookupBarcode(barcode);
  if (result.status === "not-found") return { status: "not-found" };
  if (result.status === "error") {
    return { status: "error", message: result.message };
  }

  const off = result.product;
  /* Image caching is best-effort and must never block item creation. */
  const photo = off.imageUrl
    ? await cacheProductImage(off.barcode, off.imageUrl)
    : null;

  const item = createItemFromOff(off, {
    categoryId: await chooseCategory(off),
    scanned: barcode,
    photo,
  });

  const quantity = incoming ? adjustStock(item.id, 1, "scan-in").quantity : 0;
  return { status: "created", item, existed: false, quantity };
}

/** Idle scan-to-lookup: which item a barcode maps to (null if unknown). */
export async function lookupItemId(
  barcode: string,
): Promise<{ itemId: number | null }> {
  const user = await getCurrentUser();
  if (!user) return { itemId: null };
  return { itemId: itemIdForBarcode(barcode.trim()) };
}

export type QuickAdjustResult =
  | { ok: true; quantity: number; addedToList: boolean }
  | { ok: false };

/**
 * Adjust an item's stock by ±1 from a quick-add tile or the Quick Use grid.
 * The caller supplies the source so waste is tracked distinctly. Goes through
 * the single stock mutation path (lib/stock).
 */
export async function quickAdjust(
  itemId: number,
  delta: 1 | -1,
  source: StockSource,
): Promise<QuickAdjustResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const adj = adjustStock(itemId, delta, source);
  return { ok: true, quantity: adj.quantity, addedToList: adj.addedToList };
}

/* Pick a category for an OFF-resolved item: AI best-fit when configured, else
 * the default. Non-exported helper (this is a "use server" module). */
async function chooseCategory(off: {
  name: string | null;
  brand: string | null;
  raw: Record<string, unknown>;
}): Promise<number> {
  const categories = listCategories();
  const offTags = Array.isArray(off.raw.categories_tags)
    ? (off.raw.categories_tags as unknown[])
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.replace(/^[a-z]{2}:/, "").replace(/-/g, " "))
    : [];

  const suggested = await suggestCategory({
    name: off.name ?? "",
    brand: off.brand,
    offCategories: offTags,
    categories: categories.map((c) => c.name),
  });

  const match = suggested
    ? categories.find((c) => c.name.toLowerCase() === suggested.toLowerCase())
    : undefined;
  return match?.id ?? ensureDefaultCategoryId();
}
