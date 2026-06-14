import { NextResponse } from "next/server";

import { authenticateApi, unauthorised } from "@/lib/api-auth";
import { apiInventory, apiItemDetail } from "@/lib/api";
import { createItemManual, listCategories, listStores } from "@/lib/items";
import { sanitiseNutriments } from "@/lib/nutrition";

const BARCODE_RE = /^\d{8}$|^\d{12,13}$/;

/* GET /api/v1/items — list (same as /inventory). */
export async function GET(req: Request) {
  if (!(await authenticateApi(req))) return unauthorised();
  return NextResponse.json({ items: apiInventory() });
}

/* POST /api/v1/items — create an item. Body (JSON):
 *   name (required), category (name) or categoryId, brand, size, threshold,
 *   defaultShelfLifeDays, notes, barcode, storeIds[], ingredients, allergens,
 *   nutriments {per-100g}. Quantity starts at 0 — adjust via the adjust route. */
export async function POST(req: Request) {
  if (!(await authenticateApi(req))) return unauthorised();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const categories = listCategories();
  let categoryId: number | undefined;
  if (typeof body.categoryId === "number") {
    categoryId = categories.find((c) => c.id === body.categoryId)?.id;
  } else if (typeof body.category === "string") {
    const want = body.category.trim().toLowerCase();
    categoryId = categories.find((c) => c.name.toLowerCase() === want)?.id;
  }
  if (categoryId === undefined) {
    return NextResponse.json(
      { error: "unknown category", validCategories: categories.map((c) => c.name) },
      { status: 400 },
    );
  }

  const threshold = typeof body.threshold === "number" ? body.threshold : 0;
  if (!Number.isInteger(threshold) || threshold < 0) {
    return NextResponse.json({ error: "threshold must be int ≥ 0" }, { status: 400 });
  }

  const barcode = typeof body.barcode === "string" ? body.barcode.trim() : null;
  if (barcode && !BARCODE_RE.test(barcode)) {
    return NextResponse.json({ error: "barcode must be 8/12/13 digits" }, { status: 400 });
  }

  const validStoreIds = new Set(listStores().map((s) => s.id));
  const storeIds = Array.isArray(body.storeIds)
    ? body.storeIds.filter((id): id is number => typeof id === "number" && validStoreIds.has(id))
    : [];

  const shelfLife =
    typeof body.defaultShelfLifeDays === "number" ? body.defaultShelfLifeDays : null;

  const nutriments = sanitiseNutriments(body.nutriments);

  try {
    const item = createItemManual({
      name,
      categoryId,
      brand: typeof body.brand === "string" ? body.brand.trim() : null,
      sizeText: typeof body.size === "string" ? body.size.trim() : null,
      threshold,
      defaultShelfLifeDays: shelfLife,
      notes: typeof body.notes === "string" ? body.notes.trim() : null,
      barcode,
      storeIds,
      ingredients: typeof body.ingredients === "string" ? body.ingredients : null,
      allergens: typeof body.allergens === "string" ? body.allergens : null,
      nutriments: nutriments ? JSON.stringify(nutriments) : null,
    });
    return NextResponse.json({ item: apiItemDetail(item.id) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "create failed" }, { status: 400 });
  }
}
