import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { nutrimentsFromOff, type Nutriments } from "@/lib/nutrition";

/* ------------------------------------------------------------------ *
 * Open Food Facts (OFF) API v2 client — the SINGLE owner of every OFF
 * call in the app. See the `open-food-facts` skill: these rules are not
 * suggestions. OFF enforces rate limits with IP bans and this app sits
 * behind one home IP.
 *
 *   - Custom User-Agent on every request (OFF_USER_AGENT).
 *   - 15 req/min reads, single concurrency, min spacing, 429 backoff.
 *   - Always pass `fields` — the full payload is hundreds of KB.
 *   - Cache once: callers persist the result; never re-fetch on render.
 *   - Images downloaded to the data volume, never hotlinked.
 *   - Server-side only.
 * ------------------------------------------------------------------ */

const API_BASE = "https://world.openfoodfacts.org/api/v2/product";

/* Only request what the app stores (skill: standard fields string). */
const FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "generic_name",
  "brands",
  "quantity",
  "categories_tags",
  "image_front_url",
  "image_front_small_url",
  "nutrition_grades",
  "nova_group",
  "nutriments",
  "ingredients_text",
  "allergens_tags",
  "countries_tags",
].join(",");

/* Rate-limit budget. 4s min spacing yields ≤15/min; the rolling window is a
 * safety net for burst. (skill: 15 req/min, max 1 concurrent, ~5s spacing.) */
const MIN_SPACING_MS = 4000;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

/* Same data volume as the DB (lib/db.ts derives from DB_PATH too). */
const DATA_DIR = dirname(process.env.DB_PATH ?? "./data/pantry.sqlite");
const IMAGE_DIR = join(DATA_DIR, "images", "off");

function userAgent(): string {
  return (
    process.env.OFF_USER_AGENT ?? "PantryTracker/1.0 (set OFF_USER_AGENT)"
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------- queue ------------------------------- */

/**
 * Serial queue: one OFF request at a time, spaced to respect the rate limit.
 * A single module-level instance gates every call for the process lifetime.
 */
class OffQueue {
  private chain: Promise<unknown> = Promise.resolve();
  private starts: number[] = [];
  private lastStart = 0;

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.chain.then(async () => {
      await this.throttle();
      return task();
    });
    /* Keep the chain alive regardless of individual task outcome. */
    this.chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async throttle(): Promise<void> {
    const sinceLast = Date.now() - this.lastStart;
    if (sinceLast < MIN_SPACING_MS) await sleep(MIN_SPACING_MS - sinceLast);

    this.starts = this.starts.filter((t) => Date.now() - t < WINDOW_MS);
    if (this.starts.length >= MAX_PER_WINDOW) {
      const oldest = this.starts[0]!;
      await sleep(WINDOW_MS - (Date.now() - oldest));
      this.starts = this.starts.filter((t) => Date.now() - t < WINDOW_MS);
    }

    this.lastStart = Date.now();
    this.starts.push(this.lastStart);
  }
}

const queue = new OffQueue();

/* ------------------------------- fetch ------------------------------- */

class OffError extends Error {}

async function fetchProductRaw(barcode: string): Promise<OffRawResponse | null> {
  const url = `${API_BASE}/${barcode}.json?fields=${FIELDS}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": userAgent(), Accept: "application/json" },
        signal: controller.signal,
      });

      if (res.status === 429 || res.status >= 500) {
        if (attempt === MAX_RETRIES) {
          throw new OffError(`OFF ${res.status} after ${MAX_RETRIES} retries`);
        }
        await sleep(1000 * 2 ** attempt); // 1s, 2s, 4s
        continue;
      }
      /* OFF v2 returns 404 for an unknown product — a normal "not found"
       * outcome, not an error. Treat it as status 0. */
      if (res.status === 404) return { status: 0 };
      if (!res.ok) throw new OffError(`OFF HTTP ${res.status}`);

      return (await res.json()) as OffRawResponse;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        if (err instanceof OffError) throw err;
        throw new OffError(
          err instanceof Error ? err.message : "OFF request failed",
        );
      }
      await sleep(1000 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/* --------------------------- normalisation --------------------------- */

type OffRawResponse = {
  status: 0 | 1;
  code?: string;
  product?: Record<string, unknown>;
};

export type OffProduct = {
  /** OFF's canonical code (may differ from scanned input on EAN-8/UPC-A). */
  barcode: string;
  name: string | null;
  brand: string | null;
  sizeText: string | null;
  /** Lowercase a–e, or null. Only a–e are valid for sorting. */
  nutriscore: string | null;
  /** NOVA group 1–4, or null. */
  nova: number | null;
  imageUrl: string | null;
  /** Ingredients free text, or null. */
  ingredients: string | null;
  /** Comma-separated allergen names (en: prefix stripped), or null. */
  allergens: string | null;
  /** Normalised per-100g nutriments, or null. */
  nutriments: Nutriments | null;
  /** Full OFF product object, kept verbatim for future re-mapping. */
  raw: Record<string, unknown>;
};

function allergensFromOff(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  const names = raw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.replace(/^[a-z]{2}:/, "").replace(/-/g, " ").trim())
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function normalise(scanned: string, product: Record<string, unknown>): OffProduct {
  const name =
    str(product.product_name) ??
    str(product.product_name_en) ??
    str(product.generic_name);

  const brand = str(product.brands)?.split(",")[0]?.trim() ?? null;

  const grade = str(product.nutrition_grades)?.toLowerCase() ?? null;
  const nutriscore = grade && /^[a-e]$/.test(grade) ? grade : null;

  const novaRaw = product.nova_group;
  const nova =
    typeof novaRaw === "number" && novaRaw >= 1 && novaRaw <= 4 ? novaRaw : null;

  return {
    barcode: str(product.code) ?? scanned,
    name,
    brand,
    sizeText: str(product.quantity),
    nutriscore,
    nova,
    imageUrl: str(product.image_front_url),
    ingredients: str(product.ingredients_text),
    allergens: allergensFromOff(product.allergens_tags),
    nutriments: nutrimentsFromOff(product.nutriments),
    raw: product,
  };
}

/* ------------------------------- public ------------------------------ */

export type LookupResult =
  | { status: "found"; product: OffProduct }
  | { status: "not-found" }
  | { status: "error"; message: string };

function isValidBarcode(code: string): boolean {
  return /^\d{8}$|^\d{12,13}$/.test(code);
}

/**
 * Look up a barcode against OFF. status 0 ("not found") is a normal outcome,
 * not an error — the caller routes it to manual entry. On a 12-digit (UPC-A)
 * miss, retries once with a leading zero (skill: barcode normalisation).
 */
export async function lookupBarcode(rawBarcode: string): Promise<LookupResult> {
  const barcode = rawBarcode.trim();
  if (!isValidBarcode(barcode)) {
    return { status: "error", message: "invalid barcode" };
  }

  try {
    const candidates =
      barcode.length === 12 ? [barcode, `0${barcode}`] : [barcode];

    for (const candidate of candidates) {
      const res = await queue.run(() => fetchProductRaw(candidate));
      if (res?.status === 1 && res.product) {
        return { status: "found", product: normalise(candidate, res.product) };
      }
    }
    return { status: "not-found" };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "OFF lookup failed",
    };
  }
}

/* ----------------------------- image cache --------------------------- */

function extFromUrl(url: string): string {
  const m = /\.(jpe?g|png|webp)(?:\?|$)/i.exec(url);
  return m ? m[1]!.toLowerCase().replace("jpeg", "jpg") : "jpg";
}

/**
 * Download a product image to the data volume once. Returns the stored
 * relative path (under the images dir) or null on failure — image caching
 * must never block product creation.
 */
export async function cacheProductImage(
  barcode: string,
  imageUrl: string,
): Promise<string | null> {
  try {
    const ext = extFromUrl(imageUrl);
    const filename = `${barcode}.${ext}`;
    await mkdir(IMAGE_DIR, { recursive: true });

    const res = await fetch(imageUrl, {
      headers: { "User-Agent": userAgent() },
    });
    if (!res.ok) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(join(IMAGE_DIR, filename), buf);
    /* Served later via an image route mapping /off/* → IMAGE_DIR. */
    return `off/${filename}`;
  } catch {
    return null;
  }
}
