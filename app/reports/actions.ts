"use server";

import { getCurrentUser } from "@/lib/auth";
import { generateInsightSummary } from "@/lib/ai";
import { summaryInput } from "@/lib/reports";
import { saveSummary, type CachedSummary } from "@/lib/summary";

/* ------------------------------------------------------------------ *
 * AI monthly summary (BRIEF §5.6). Generated on demand and cached in
 * settings so it isn't regenerated on every page load.
 * ------------------------------------------------------------------ */

export type GenerateSummaryResult =
  | { status: "ok"; summary: CachedSummary }
  | { status: "not-configured" }
  | { status: "error"; message: string };

export async function generateSummaryAction(): Promise<GenerateSummaryResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Not signed in." };

  const input = summaryInput();
  const res = await generateInsightSummary(input);

  if (res.status === "not-configured") return { status: "not-configured" };
  if (res.status === "error") return { status: "error", message: res.message };

  const summary: CachedSummary = {
    text: res.text,
    generatedAt: Date.now(),
    period: input.period,
  };
  saveSummary(summary);
  return { status: "ok", summary };
}
