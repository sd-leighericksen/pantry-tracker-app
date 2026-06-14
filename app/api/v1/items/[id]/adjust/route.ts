import { NextResponse } from "next/server";

import { authenticateApi, unauthorised } from "@/lib/api-auth";
import { adjustStock } from "@/lib/stock";

/* POST /api/v1/items/:id/adjust — Body: { delta: number }. Goes through the
 * single stock mutation path (writes a stock_events row, source "ai"). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await authenticateApi(req))) return unauthorised();

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const delta = (body as { delta?: unknown })?.delta;
  if (typeof delta !== "number" || !Number.isInteger(delta) || delta === 0) {
    return NextResponse.json(
      { error: "delta must be a non-zero integer" },
      { status: 400 },
    );
  }

  try {
    const adj = adjustStock(id, delta, "ai");
    return NextResponse.json({
      ok: true,
      quantity: adj.quantity,
      addedToList: adj.addedToList,
    });
  } catch {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }
}
