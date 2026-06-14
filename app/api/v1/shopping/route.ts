import { NextResponse } from "next/server";

import { authenticateApi, unauthorised } from "@/lib/api-auth";
import { apiShopping } from "@/lib/api";
import { addFreeTextItem } from "@/lib/shopping";

/* GET /api/v1/shopping — the list (pending + ticked). */
export async function GET(req: Request) {
  if (!(await authenticateApi(req))) return unauthorised();
  return NextResponse.json({ items: apiShopping() });
}

/* POST /api/v1/shopping — add a free-text item. Body: { text, storeId? } */
export async function POST(req: Request) {
  if (!(await authenticateApi(req))) return unauthorised();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { text, storeId } = (body ?? {}) as {
    text?: unknown;
    storeId?: unknown;
  };
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  try {
    addFreeTextItem(
      text.trim().slice(0, 200),
      typeof storeId === "number" ? storeId : null,
    );
  } catch {
    /* e.g. a storeId that doesn't exist (FK constraint). */
    return NextResponse.json({ error: "invalid storeId" }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
