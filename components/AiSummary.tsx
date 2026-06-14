"use client";

import { useState, useTransition } from "react";
import { Sparkle } from "@phosphor-icons/react";

import { generateSummaryAction } from "@/app/reports/actions";
import type { CachedSummary } from "@/lib/summary";

/* AI monthly summary (BRIEF §5.6). On-demand generation; the cached result is
 * passed in from the server so it shows instantly without an AI call. */
export function AiSummary({
  cached,
  configured,
}: {
  cached: CachedSummary | null;
  configured: boolean;
}) {
  const [summary, setSummary] = useState<CachedSummary | null>(cached);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(!configured);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await generateSummaryAction();
      if (res.status === "ok") {
        setSummary(res.summary);
        setNotConfigured(false);
      } else if (res.status === "not-configured") {
        setNotConfigured(true);
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-hairline-strong bg-surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-medium text-ink">
          <Sparkle size={20} className="text-accent" />
          Monthly summary
        </h2>
        {configured && (
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="h-9 rounded-md bg-surface-elevated px-4 text-sm font-medium text-ink transition-opacity disabled:opacity-50"
          >
            {pending ? "Writing…" : summary ? "Regenerate" : "Generate"}
          </button>
        )}
      </div>

      {notConfigured ? (
        <p className="text-sm text-charcoal">
          Set <code className="font-mono text-body">OPENROUTER_API_KEY</code> to
          generate a natural-language summary of buying patterns, waste, and
          suggestions.
        </p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : summary ? (
        <div className="flex flex-col gap-2">
          {summary.text.split(/\n+/).map((para, i) => (
            <p key={i} className="text-body leading-relaxed">
              {para}
            </p>
          ))}
          <p className="mt-1 text-xs text-charcoal">
            {summary.period} · generated{" "}
            {new Date(summary.generatedAt).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
      ) : (
        <p className="text-sm text-charcoal">
          No summary yet — generate one from this month&rsquo;s activity.
        </p>
      )}
    </section>
  );
}
