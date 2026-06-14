"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, MagnifyingGlass } from "@phosphor-icons/react";

import type { QuickItem } from "@/lib/quick";
import { quickAdjust } from "@/app/kiosk/actions";
import { QuickAddTile } from "@/components/kiosk/QuickAddTile";

/* Quick Use (BRIEF §5.3): the scan-out fallback when there's no barcode. One
 * tap = −1. Items are pre-sorted in-stock-first by usage frequency; a search
 * narrows long lists. No arming needed — this surface is always "use". */
export function QuickUseGrid({ items }: { items: QuickItem[] }) {
  const [list, setList] = useState<QuickItem[]>(items);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? list.filter((i) => i.name.toLowerCase().includes(q)) : list;
  }, [list, query]);

  function use(item: QuickItem) {
    if (item.quantity <= 0) return;
    startTransition(async () => {
      const res = await quickAdjust(item.id, -1, "quick-use");
      if (!res.ok) return;
      setList((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, quantity: res.quantity } : t)),
      );
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        <Link
          href="/kiosk"
          aria-label="Back to scan"
          className="flex size-11 items-center justify-center rounded-md border border-hairline-strong bg-surface-card text-ink"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Quick Use</h1>
          <p className="text-sm text-charcoal">Tap an item to use one</p>
        </div>
      </header>

      <label className="relative block">
        <MagnifyingGlass
          size={20}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ash"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items…"
          aria-label="Search items"
          className="h-12 w-full rounded-md border border-hairline-strong bg-surface-card pl-11 pr-4 text-ink outline-none transition-colors placeholder:text-ash focus-visible:border-ink"
        />
      </label>

      {filtered.length === 0 ? (
        <div className="flex min-h-[10rem] items-center justify-center rounded-xl border border-dashed border-hairline-strong text-charcoal">
          No items
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item) => (
            <QuickAddTile
              key={item.id}
              item={item}
              onTap={use}
              disabled={item.quantity <= 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
