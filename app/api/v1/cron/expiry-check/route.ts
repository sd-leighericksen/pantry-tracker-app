import { NextResponse } from "next/server";

import { authenticateApi, unauthorised } from "@/lib/api-auth";
import { runExpiryNotifications } from "@/lib/webhooks";

/* POST /api/v1/cron/expiry-check — trigger from cron/n8n/HA (e.g. daily).
 * Fires item.expiring_soon webhooks for newly use-soon items. */
export async function POST(req: Request) {
  if (!(await authenticateApi(req))) return unauthorised();
  return NextResponse.json({ ok: true, notified: runExpiryNotifications() });
}
