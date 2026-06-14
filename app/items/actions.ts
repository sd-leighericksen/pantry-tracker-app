"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { extractProductFromImage, type AiProduct } from "@/lib/ai";
import { saveDataUrlImage } from "@/lib/uploads";
import {
  addBarcodeToItem,
  archiveItem,
  createItemManual,
  getItem,
  itemIdForBarcode,
  listCategories,
  listStores,
  removeBarcodeFromItem,
  updateItem,
  updateItemFromOff,
  type CreatedItem,
  type ItemPatch,
} from "@/lib/items";
import { cacheProductImage, lookupBarcode } from "@/lib/off-client";
import { adjustStock } from "@/lib/stock";
import { addItemToList } from "@/lib/shopping";
import { sanitiseNutriments, type Nutriments } from "@/lib/nutrition";

/* ------------------------------------------------------------------ *
 * Manual item creation (BRIEF §5.2 path 3). Used by the kiosk modal and the
 * standalone /items/new route. Server actions are authenticated like API
 * routes (vercel-react-best-practices: server-auth-actions).
 * ------------------------------------------------------------------ */

export type ManualCreateInput = {
  name: string;
  brand?: string;
  categoryId: number;
  threshold?: number;
  defaultShelfLifeDays?: number | null;
  notes?: string;
  storeIds?: number[];
  preferredStoreId?: number | null;
  barcode?: string | null;
  pinned?: boolean;
  icon?: string | null;
  photo?: string | null;
  sizeText?: string | null;
  ingredients?: string | null;
  allergens?: string | null;
  nutriments?: Nutriments | null;
};

export type ManualCreateResult =
  | { ok: true; item: CreatedItem }
  | { ok: false; error: string };

const BARCODE_RE = /^\d{8}$|^\d{12,13}$/;

export async function createItemManualAction(
  input: ManualCreateInput,
): Promise<ManualCreateResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const name = input.name?.trim() ?? "";
  if (!name) return { ok: false, error: "Name is required." };
  if (name.length > 200) return { ok: false, error: "Name is too long." };

  const validCategoryIds = new Set(listCategories().map((c) => c.id));
  if (!validCategoryIds.has(input.categoryId)) {
    return { ok: false, error: "Choose a category." };
  }

  const threshold = input.threshold ?? 0;
  if (!Number.isInteger(threshold) || threshold < 0) {
    return { ok: false, error: "Threshold must be a whole number ≥ 0." };
  }

  const shelfLife = input.defaultShelfLifeDays ?? null;
  if (
    shelfLife !== null &&
    (!Number.isInteger(shelfLife) || shelfLife < 1 || shelfLife > 3650)
  ) {
    return { ok: false, error: "Shelf life must be 1–3650 days." };
  }

  const barcode = input.barcode?.trim() || null;
  if (barcode && !BARCODE_RE.test(barcode)) {
    return { ok: false, error: "Barcode must be 8, 12, or 13 digits." };
  }

  /* Drop any store ids the client sent that don't exist. */
  const validStoreIds = new Set(listStores().map((s) => s.id));
  const storeIds = (input.storeIds ?? []).filter((id) => validStoreIds.has(id));
  const preferredStoreId =
    input.preferredStoreId && storeIds.includes(input.preferredStoreId)
      ? input.preferredStoreId
      : null;

  const icon = input.icon?.trim() || null;
  const item = createItemManual({
    name,
    brand: input.brand?.trim() || null,
    categoryId: input.categoryId,
    threshold,
    defaultShelfLifeDays: shelfLife,
    notes: input.notes?.trim() || null,
    storeIds,
    preferredStoreId,
    barcode,
    pinned: input.pinned ?? false,
    icon: icon ? [...icon][0]! : null, // a single glyph
    photo: input.photo ?? null,
    sizeText: input.sizeText?.trim() || null,
    ingredients: input.ingredients?.trim() || null,
    allergens: input.allergens?.trim() || null,
    nutriments: serialiseNutriments(input.nutriments),
  });

  return { ok: true, item };
}

function serialiseNutriments(raw: Nutriments | null | undefined): string | null {
  const n = sanitiseNutriments(raw);
  return n ? JSON.stringify(n) : null;
}

export type AnalyzeResult =
  | {
      ok: true;
      photo: string | null;
      extracted: AiProduct | null;
      aiStatus: "ok" | "not-configured" | "error";
      message?: string;
    }
  | { ok: false; error: string };

/**
 * AI photo capture (BRIEF §5.2 path 4): save the photo, then ask the vision
 * model to extract fields. The photo is kept even when AI is unconfigured or
 * fails, so the user can still fill the form manually. Never auto-commits.
 */
export async function analyzePhoto(dataUrl: string): Promise<AnalyzeResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const photo = await saveDataUrlImage(dataUrl);
  if (!photo) return { ok: false, error: "Unsupported image." };

  const res = await extractProductFromImage(
    dataUrl,
    listCategories().map((c) => c.name),
  );
  if (res.status === "ok") {
    return { ok: true, photo, extracted: res.product, aiStatus: "ok" };
  }
  if (res.status === "not-configured") {
    return { ok: true, photo, extracted: null, aiStatus: "not-configured" };
  }
  return {
    ok: true,
    photo,
    extracted: null,
    aiStatus: "error",
    message: res.message,
  };
}

/* ------------------------------- detail ------------------------------ */

const BARCODE_RE_FULL = /^\d{8}$|^\d{12,13}$/;

export type ActionResult = { ok: boolean; error?: string };

export async function updateItemAction(
  id: number,
  patch: ItemPatch,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const name = patch.name?.trim() ?? "";
  if (!name) return { ok: false, error: "Name is required." };
  if (!Number.isInteger(patch.threshold) || patch.threshold < 0) {
    return { ok: false, error: "Threshold must be a whole number ≥ 0." };
  }
  const validCategoryIds = new Set(listCategories().map((c) => c.id));
  if (!validCategoryIds.has(patch.categoryId)) {
    return { ok: false, error: "Choose a category." };
  }
  const validStoreIds = new Set(listStores().map((s) => s.id));
  const storeIds = (patch.storeIds ?? []).filter((sid) => validStoreIds.has(sid));
  const icon = patch.icon?.trim() || null;

  updateItem(id, {
    ...patch,
    name,
    brand: patch.brand?.trim() || null,
    notes: patch.notes?.trim() || null,
    icon: icon ? [...icon][0]! : null,
    storeIds,
  });
  revalidatePath(`/items/${id}`);
  revalidatePath("/inventory");
  return { ok: true };
}

/** Manual ±1 (or any delta) stock change from the detail qty-stepper. */
export async function adjustItemQtyAction(
  id: number,
  delta: number,
): Promise<{ ok: boolean; quantity?: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const adj = adjustStock(id, delta, "manual");
  revalidatePath(`/items/${id}`);
  revalidatePath("/inventory");
  return { ok: true, quantity: adj.quantity };
}

export async function addBarcodeAction(
  id: number,
  barcode: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const code = barcode.trim();
  if (!BARCODE_RE_FULL.test(code)) {
    return { ok: false, error: "Barcode must be 8, 12, or 13 digits." };
  }
  if (itemIdForBarcode(code) !== null) {
    return { ok: false, error: "That barcode is already in use." };
  }
  addBarcodeToItem(id, code);
  revalidatePath(`/items/${id}`);
  return { ok: true };
}

export async function removeBarcodeAction(
  id: number,
  barcode: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  removeBarcodeFromItem(barcode);
  revalidatePath(`/items/${id}`);
  return { ok: true };
}

export async function archiveItemAction(id: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  archiveItem(id);
  revalidatePath("/inventory");
  return { ok: true };
}

export type RefreshResult =
  | { ok: true; status: "updated" | "not-found" | "no-barcode" }
  | { ok: false; error: string };

/** Re-search Open Food Facts using the item's barcode and refresh its info. */
export async function refreshFromOffAction(id: number): Promise<RefreshResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const item = getItem(id);
  if (!item) return { ok: false, error: "Not found." };
  const barcode = item.barcodes[0];
  if (!barcode) return { ok: true, status: "no-barcode" };

  const res = await lookupBarcode(barcode);
  if (res.status === "not-found") return { ok: true, status: "not-found" };
  if (res.status === "error") return { ok: false, error: res.message };

  const off = res.product;
  const photo = off.imageUrl
    ? ((await cacheProductImage(off.barcode, off.imageUrl)) ?? item.photo)
    : item.photo;
  updateItemFromOff(id, off, photo);

  revalidatePath(`/items/${id}`);
  revalidatePath("/inventory");
  return { ok: true, status: "updated" };
}

export async function addToListAction(id: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  addItemToList(id);
  revalidatePath("/shopping");
  return { ok: true };
}
