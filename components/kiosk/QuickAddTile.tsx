"use client";

import type { QuickItem } from "@/lib/quick";

/* Quick-add tile (DESIGN.md quick-add-tile): 144px, user emoji or photo at
 * 64px with the label below, current quantity badge. Tap behaviour is owned
 * by the parent (kiosk tiles respect the armed mode; Quick Use uses −1). */

export function QuickAddTile({
  item,
  onTap,
  disabled,
}: {
  item: QuickItem;
  onTap: (item: QuickItem) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onTap(item)}
      disabled={disabled}
      className="relative flex h-36 flex-col items-center justify-center gap-2 rounded-lg border border-hairline-strong bg-surface-elevated p-3 text-center transition-opacity disabled:opacity-40"
    >
      <span className="absolute right-2 top-2 font-mono text-sm tabular-nums text-charcoal">
        {item.quantity}
      </span>
      <Glyph item={item} />
      <span className="line-clamp-2 text-base font-medium leading-tight text-ink">
        {item.name}
      </span>
    </button>
  );
}

function Glyph({ item }: { item: QuickItem }) {
  if (item.icon) return <span className="text-5xl leading-none">{item.icon}</span>;
  if (item.photo) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- cached local image */
      <img src={`/img/${item.photo}`} alt="" className="size-16 rounded-md object-cover" />
    );
  }
  return (
    <span className="flex size-16 items-center justify-center rounded-md bg-surface-card text-2xl font-semibold text-charcoal">
      {item.name.charAt(0).toUpperCase()}
    </span>
  );
}
