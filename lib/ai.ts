import "server-only";

/* ------------------------------------------------------------------ *
 * AI product extraction via OpenRouter (BRIEF §5.2 path 4, §7). All AI
 * calls are server-side and go through OpenRouter; the key lives in env
 * only. Output is a best-guess used to PRE-FILL the manual form — never
 * auto-committed. Model id is configurable (OPENROUTER_VISION_MODEL).
 * ------------------------------------------------------------------ */

import { sanitiseNutriments, type Nutriments } from "@/lib/nutrition";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_VISION_MODEL = "anthropic/claude-3.5-sonnet";
const DEFAULT_TEXT_MODEL = "anthropic/claude-3.5-haiku";

export type AiProduct = {
  name: string | null;
  brand: string | null;
  sizeText: string | null;
  /** A category name the model picked from the supplied list, or null. */
  categoryHint: string | null;
  /** Lowercase a–e best guess, or null. */
  nutriscore: string | null;
  ingredients: string | null;
  allergens: string | null;
  /** Per-100g nutriments read from the label, or null. */
  nutriments: Nutriments | null;
};

export type ExtractResult =
  | { status: "ok"; product: AiProduct }
  | { status: "not-configured" }
  | { status: "error"; message: string };

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * Send a product photo (data URL) to the vision model and extract fields.
 * `categories` is the list of valid category names so the model can map to
 * one. Returns `not-configured` when no API key is set — callers fall back
 * to plain manual entry.
 */
export async function extractProductFromImage(
  dataUrl: string,
  categories: string[],
): Promise<ExtractResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { status: "not-configured" };

  const model = process.env.OPENROUTER_VISION_MODEL || DEFAULT_VISION_MODEL;

  const prompt =
    "You are reading a photo of a grocery product (front of pack and/or label). " +
    "Extract what you can see. Respond ONLY with a JSON object with keys: " +
    "name (product name, no brand), brand, size (free text like \"1L\" or \"500 g\"), " +
    `category (choose the closest from this list or null: ${categories.join(", ")}), ` +
    "nutriscore (a single letter a-e if a Nutri-Score logo is visible, else null), " +
    "ingredients (the ingredients list as plain text, else null), " +
    "allergens (comma-separated allergen names, else null), " +
    "nutriments (an object of PER-100g numbers from the nutrition panel with any of: " +
    "energyKcal, energyKj, fat, saturatedFat, carbohydrates, sugars, fibre, proteins, salt — " +
    "omit keys you can't read, or null if no panel is visible). " +
    "Use null for anything not visible. Do not guess values that aren't shown.";

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Pantry Tracker",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      return { status: "error", message: `OpenRouter ${res.status}` };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return { status: "error", message: "Empty AI response" };

    const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>;
    const grade = str(parsed.nutriscore)?.toLowerCase() ?? null;

    return {
      status: "ok",
      product: {
        name: str(parsed.name),
        brand: str(parsed.brand),
        sizeText: str(parsed.size),
        categoryHint: str(parsed.category),
        nutriscore: grade && /^[a-e]$/.test(grade) ? grade : null,
        ingredients: str(parsed.ingredients),
        allergens: str(parsed.allergens),
        nutriments: sanitiseNutriments(parsed.nutriments),
      },
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "AI request failed",
    };
  }
}

export type SummaryResult =
  | { status: "ok"; text: string }
  | { status: "not-configured" }
  | { status: "error"; message: string };

/**
 * Natural-language monthly pantry summary (BRIEF §5.6). Text model, plain
 * prose out. Generated on demand (cached by the caller), never per page load.
 */
export async function generateInsightSummary(
  data: unknown,
): Promise<SummaryResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { status: "not-configured" };

  const model = process.env.OPENROUTER_TEXT_MODEL || DEFAULT_TEXT_MODEL;

  const prompt =
    "You write a short, friendly monthly summary for a single household's " +
    "pantry tracker. Cover buying and usage patterns, call out any waste " +
    "(expired items), and give one or two practical, specific suggestions " +
    "(e.g. adjust a threshold, buy less of something). Use Australian English. " +
    "Two or three short paragraphs, plain text, no headings or markdown. " +
    `Here is the data as JSON:\n${JSON.stringify(data)}`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Pantry Tracker",
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) return { status: "error", message: `OpenRouter ${res.status}` };

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = str(json.choices?.[0]?.message?.content);
    if (!text) return { status: "error", message: "Empty AI response" };
    return { status: "ok", text };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "AI request failed",
    };
  }
}

/**
 * Pick the best-fit category (from the household's own list) for a product,
 * using the text model. Used when auto-creating from an OFF scan so items
 * don't all land in the default category. Returns a category name from the
 * supplied list, or null when AI is unconfigured / unsure (caller defaults).
 */
export async function suggestCategory(opts: {
  name: string;
  brand: string | null;
  offCategories: string[];
  categories: string[];
}): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || opts.categories.length === 0) return null;

  const model = process.env.OPENROUTER_TEXT_MODEL || DEFAULT_TEXT_MODEL;
  const prompt =
    `Product: "${opts.name}"${opts.brand ? ` by ${opts.brand}` : ""}. ` +
    (opts.offCategories.length
      ? `Open Food Facts categories: ${opts.offCategories.join(", ")}. `
      : "") +
    `Choose the single best-fitting category for storing this item from EXACTLY ` +
    `this list: ${opts.categories.join(", ")}. ` +
    `Reply with only the category name, nothing else.`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Pantry Tracker",
      },
      body: JSON.stringify({
        model,
        max_tokens: 20,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = str(json.choices?.[0]?.message?.content)?.toLowerCase();
    if (!reply) return null;
    /* Exact match, else the first category whose name appears in the reply. */
    return (
      opts.categories.find((c) => c.toLowerCase() === reply) ??
      opts.categories.find((c) => reply.includes(c.toLowerCase())) ??
      null
    );
  } catch {
    return null;
  }
}

/** Tolerate models that wrap JSON in prose or ```json fences. */
function extractJson(content: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(content);
  if (fenced) return fenced[1]!.trim();
  const brace = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (brace >= 0 && end > brace) return content.slice(brace, end + 1);
  return content;
}
