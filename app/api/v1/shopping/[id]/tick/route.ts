import { NextResponse } from "next/server";

import { authenticateApi, unauthorised } from "@/lib/api-auth";
import { setTicked } from "@/lib/shopping";

/* POST /api/v1/shopping/:id/tick — Body: { ticked: boolean } */
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
  const ticked = (body as { ticked?: unknown })?.ticked;
  if (typeof ticked !== "boolean") {
    return NextResponse.json({ error: "ticked must be boolean" }, { status: 400 });
  }

  setTicked(id, ticked);
  return NextResponse.json({ ok: true });
}
