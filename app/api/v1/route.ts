import { NextResponse } from "next/server";

import { authenticateApi, unauthorised } from "@/lib/api-auth";

/* GET /api/v1 — capability discovery for LLM agents / integrations. Describes
 * what the pantry exposes and how to read and modify it. */
export async function GET(req: Request) {
  if (!(await authenticateApi(req))) return unauthorised();
  return NextResponse.json({
    name: "Pantry Tracker API",
    version: "1",
    description:
      "Read and modify a single household's pantry: what's in stock, " +
      "quantities, nutrition, ingredients, allergens, and the shopping list.",
    auth: "Authorization: Bearer <token> (create one in Settings → tokens)",
    endpoints: {
      "GET /api/v1/stats": "Counts + shopping list (shoppingCount, lowStockCount, expiringCount, expiredCount, shoppingList[]).",
      "GET /api/v1/inventory": "All items: id, name, brand, category, quantity, threshold, nutriscore, low/expiry flags.",
      "GET /api/v1/items/:id": "Full item incl size, nutriments (per 100g), ingredients, allergens, barcodes.",
      "POST /api/v1/items": "Create an item. Body: name (req), category (name) or categoryId, brand, size, threshold, defaultShelfLifeDays, notes, barcode, storeIds[], ingredients, allergens, nutriments{}.",
      "PATCH /api/v1/items/:id": "Edit fields (partial; merged over current).",
      "DELETE /api/v1/items/:id": "Archive (remove from inventory).",
      "POST /api/v1/items/:id/adjust": "Change stock. Body: { delta } (e.g. -1 used, +1 bought). Quantity never set directly.",
      "GET /api/v1/shopping": "The shopping list.",
      "POST /api/v1/shopping": "Add a free-text item. Body: { text, storeId? }.",
      "POST /api/v1/shopping/:id/tick": "Tick/untick. Body: { ticked }.",
      "GET /api/v1/events?limit=50": "Recent stock movements.",
    },
    notes: [
      "Quantities only change via /adjust — it writes an auditable stock event.",
      "Nutrition/ingredients/allergens are read-only here; they come from Open Food Facts or AI photo capture.",
      "Items created here start at quantity 0; call /adjust to set stock.",
    ],
  });
}
