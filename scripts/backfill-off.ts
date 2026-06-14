import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { nutrimentsFromOff } from "@/lib/nutrition";

/* ------------------------------------------------------------------ *
 * One-off backfill: items resolved from Open Food Facts before the
 * size/ingredients/allergens/nutriments columns existed still have that
 * data sitting in their raw off_data. Re-map it into the new columns.
 *
 *   pnpm db:backfill-off
 * ------------------------------------------------------------------ */

const str = (v: unknown) =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null;

function allergens(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  const names = raw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.replace(/^[a-z]{2}:/, "").replace(/-/g, " ").trim())
    .filter(Boolean);
  return names.length ? names.join(", ") : null;
}

const rows = db
  .select({ id: schema.items.id, offData: schema.items.offData })
  .from(schema.items)
  .all()
  .filter((r) => r.offData);

let updated = 0;
for (const r of rows) {
  let p: Record<string, unknown>;
  try {
    p = JSON.parse(r.offData!) as Record<string, unknown>;
  } catch {
    continue;
  }
  const n = nutrimentsFromOff(p.nutriments);
  db.update(schema.items)
    .set({
      sizeText: str(p.quantity),
      ingredients: str(p.ingredients_text),
      allergens: allergens(p.allergens_tags),
      nutriments: n ? JSON.stringify(n) : null,
    })
    .where(eq(schema.items.id, r.id))
    .run();
  updated += 1;
}

console.log(`[backfill-off] re-mapped ${updated} OFF item(s).`);
