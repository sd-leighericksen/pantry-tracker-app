import { NextResponse } from "next/server";

import { authenticateApi, unauthorised } from "@/lib/api-auth";
import { apiItemDetail } from "@/lib/api";
import {
  archiveItem,
  getItem,
  listCategories,
  listStores,
  updateItem,
} from "@/lib/items";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

/* GET /api/v1/items/:id — full detail incl nutrition, ingredients, allergens. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await authenticateApi(req))) return unauthorised();
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const item = apiItemDetail(id);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item });
}

/* PATCH /api/v1/items/:id — partial edit (merged over current values). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await authenticateApi(req))) return unauthorised();
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const current = getItem(id);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  /* Resolve category if supplied by id or name. */
  let categoryId = current.categoryId;
  if (typeof body.categoryId === "number" || typeof body.category === "string") {
    const cats = listCategories();
    const match =
      typeof body.categoryId === "number"
        ? cats.find((c) => c.id === body.categoryId)
        : cats.find(
            (c) => c.name.toLowerCase() === String(body.category).trim().toLowerCase(),
          );
    if (!match) return NextResponse.json({ error: "unknown category" }, { status: 400 });
    categoryId = match.id;
  }

  const threshold =
    typeof body.threshold === "number" ? body.threshold : current.threshold;
  if (!Number.isInteger(threshold) || threshold < 0) {
    return NextResponse.json({ error: "threshold must be int ≥ 0" }, { status: 400 });
  }

  let storeIds = current.storeIds;
  if (Array.isArray(body.storeIds)) {
    const valid = new Set(listStores().map((s) => s.id));
    storeIds = body.storeIds.filter(
      (sid): sid is number => typeof sid === "number" && valid.has(sid),
    );
  }

  const str = (v: unknown, fallback: string | null) =>
    typeof v === "string" ? v.trim() || null : fallback;

  updateItem(id, {
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : current.name,
    brand: str(body.brand, current.brand),
    categoryId,
    threshold,
    defaultShelfLifeDays:
      typeof body.defaultShelfLifeDays === "number"
        ? body.defaultShelfLifeDays
        : current.defaultShelfLifeDays,
    notes: str(body.notes, current.notes),
    pinned: typeof body.pinned === "boolean" ? body.pinned : current.pinned,
    icon: current.icon,
    sizeText: str(body.size, current.sizeText),
    storeIds,
    preferredStoreId: current.preferredStoreId,
  });

  return NextResponse.json({ item: apiItemDetail(id) });
}

/* DELETE /api/v1/items/:id — archive (soft delete). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await authenticateApi(req))) return unauthorised();
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "bad id" }, { status: 400 });
  if (!getItem(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  archiveItem(id);
  return NextResponse.json({ ok: true });
}
