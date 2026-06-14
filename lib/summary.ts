import "server-only";

import { getSetting, setSetting } from "@/lib/settings";

/* Cache for the AI monthly summary (BRIEF §5.6) — kept in settings so it
 * survives restarts and isn't regenerated on every page load. */

const SUMMARY_KEY = "ai_monthly_summary";

export type CachedSummary = { text: string; generatedAt: number; period: string };

export function readCachedSummary(): CachedSummary | null {
  const raw = getSetting(SUMMARY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedSummary;
  } catch {
    return null;
  }
}

export function saveSummary(summary: CachedSummary): void {
  setSetting(SUMMARY_KEY, JSON.stringify(summary));
}
