/* Nutriments — normalised per-100g values (BRIEF §5.2, OFF skill fields.md).
 * Client-safe (no server-only/db deps) so the item detail can render it and
 * the OFF/AI layers can produce it. All fields optional; only present ones
 * are stored/shown. */

export type Nutriments = {
  energyKcal?: number;
  energyKj?: number;
  fat?: number;
  saturatedFat?: number;
  carbohydrates?: number;
  sugars?: number;
  fibre?: number;
  proteins?: number;
  salt?: number;
  sodium?: number;
};

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Map an OFF `nutriments` object (per-100g keys) to our shape. */
export function nutrimentsFromOff(raw: unknown): Nutriments | null {
  if (!raw || typeof raw !== "object") return null;
  const n = raw as Record<string, unknown>;
  const out: Nutriments = {
    energyKcal: num(n["energy-kcal_100g"]),
    energyKj: num(n["energy-kj_100g"]),
    fat: num(n["fat_100g"]),
    saturatedFat: num(n["saturated-fat_100g"]),
    carbohydrates: num(n["carbohydrates_100g"]),
    sugars: num(n["sugars_100g"]),
    fibre: num(n["fiber_100g"]),
    proteins: num(n["proteins_100g"]),
    salt: num(n["salt_100g"]),
    sodium: num(n["sodium_100g"]),
  };
  return hasAny(out) ? out : null;
}

/** Keep only finite numbers; return null if nothing usable (for AI output). */
export function sanitiseNutriments(raw: unknown): Nutriments | null {
  if (!raw || typeof raw !== "object") return null;
  const n = raw as Record<string, unknown>;
  const out: Nutriments = {
    energyKcal: num(n.energyKcal),
    energyKj: num(n.energyKj),
    fat: num(n.fat),
    saturatedFat: num(n.saturatedFat),
    carbohydrates: num(n.carbohydrates),
    sugars: num(n.sugars),
    fibre: num(n.fibre),
    proteins: num(n.proteins),
    salt: num(n.salt),
    sodium: num(n.sodium),
  };
  return hasAny(out) ? out : null;
}

function hasAny(n: Nutriments): boolean {
  return Object.values(n).some((v) => v !== undefined);
}

export function parseNutriments(json: string | null): Nutriments | null {
  if (!json) return null;
  try {
    return sanitiseNutriments(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Ordered rows for display, skipping absent values. */
export const NUTRIMENT_ROWS: { key: keyof Nutriments; label: string; unit: string }[] = [
  { key: "energyKcal", label: "Energy", unit: "kcal" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "saturatedFat", label: "  of which saturates", unit: "g" },
  { key: "carbohydrates", label: "Carbohydrate", unit: "g" },
  { key: "sugars", label: "  of which sugars", unit: "g" },
  { key: "fibre", label: "Fibre", unit: "g" },
  { key: "proteins", label: "Protein", unit: "g" },
  { key: "salt", label: "Salt", unit: "g" },
];
