import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { adjustStock } from "@/lib/stock";

/* ------------------------------------------------------------------ *
 * Scan resolution — turn a raw barcode + armed mode into a stock effect.
 *
 * Lookup order is BRIEF §5.2: local DB first. Open Food Facts / manual /
 * AI resolution of unknown barcodes is a later phase; here an unknown
 * barcode is reported so the kiosk can queue it without breaking the
 * armed flow (BRIEF §5.1, barcode-scanner-wedge skill).
 * ------------------------------------------------------------------ */

/** in = stock up · out = used/consumed · waste = thrown away (tracked separately). */
export type ScanMode = "in" | "out" | "waste";

/** Item fields the scan-toast needs to render. */
export type ScannedItem = {
  id: number;
  name: string;
  brand: string | null;
  photo: string | null;
  nutriscore: string | null;
  quantity: number;
};

export type ScanResult =
  | { status: "ok"; mode: ScanMode; item: ScannedItem; addedToList: boolean }
  | { status: "unknown"; barcode: string }
  | { status: "variable-weight"; barcode: string }
  | { status: "zero-stock"; item: ScannedItem }
  | { status: "invalid"; barcode: string };

/** EAN/UPC: digits only, length 8, 12, or 13. */
function isValidBarcode(code: string): boolean {
  return /^\d{8}$|^\d{12,13}$/.test(code);
}

/**
 * Variable-weight / in-store barcodes (butcher, deli, produce scales) use the
 * GS1 restricted-distribution prefix "2" on EAN-13. These encode a price, not
 * a stable product identity, so they must never be looked up — route to
 * quick-add instead (CLAUDE.md, BRIEF §10).
 */
function isVariableWeight(code: string): boolean {
  return code.length === 13 && code.startsWith("2");
}

export function resolveScan(rawBarcode: string, mode: ScanMode): ScanResult {
  const barcode = rawBarcode.trim();

  if (!isValidBarcode(barcode)) {
    return { status: "invalid", barcode };
  }
  if (isVariableWeight(barcode)) {
    return { status: "variable-weight", barcode };
  }

  const row = db
    .select({
      id: schema.items.id,
      name: schema.items.name,
      brand: schema.items.brand,
      photo: schema.items.photo,
      nutriscore: schema.items.nutriscore,
      quantity: schema.items.quantity,
    })
    .from(schema.barcodes)
    .innerJoin(schema.items, eq(schema.barcodes.itemId, schema.items.id))
    .where(eq(schema.barcodes.barcode, barcode))
    .get();

  if (!row) {
    return { status: "unknown", barcode };
  }

  /* Scanning out (used or wasted) an item already at zero is a decision
   * point, not a no-op — the kiosk prompts about it (BRIEF §5.1). */
  if (mode !== "in" && row.quantity === 0) {
    return { status: "zero-stock", item: row };
  }

  const source =
    mode === "in" ? "scan-in" : mode === "waste" ? "waste" : "scan-out";
  const adjustment = adjustStock(row.id, mode === "in" ? 1 : -1, source);

  return {
    status: "ok",
    mode,
    item: { ...row, quantity: adjustment.quantity },
    addedToList: adjustment.addedToList,
  };
}
