import Link from "next/link";

import { NutriScore } from "@/components/NutriScore";
import { NovaScore } from "@/components/NovaScore";
import type { InventoryItem } from "@/lib/inventory";

/* Photo-led inventory tile (DESIGN.md product-card). Low stock carries a
 * 1px danger border — no fill change. Missing photo falls back to an
 * initial-letter tile, never an icon or gradient. Tapping opens the item. */

export function ProductCard({ item }: { item: InventoryItem }) {
  return (
    <Link
      href={`/items/${item.id}`}
      className={`flex flex-col rounded-lg border bg-surface-card p-4 ${
        item.lowStock ? "border-danger" : "border-hairline"
      }`}
    >
      <div className="relative">
        <Photo photo={item.photo} name={item.name} />
        {item.expired ? (
          <span className="absolute right-2 top-2 rounded-full bg-danger px-2 py-0.5 text-xs font-medium text-ink">
            Expired
          </span>
        ) : item.expiringSoon ? (
          <span className="absolute right-2 top-2 rounded-full bg-warning px-2 py-0.5 text-xs font-medium text-on-light">
            Use soon
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 truncate text-xl font-medium text-ink">{item.name}</h3>
      {item.brand && (
        <p className="truncate text-sm text-charcoal">{item.brand}</p>
      )}

      <div className="mt-3 flex items-end justify-between gap-2">
        <span
          className={`font-mono text-[28px] leading-none tabular-nums ${
            item.lowStock ? "text-danger" : "text-ink"
          }`}
        >
          {item.quantity}
        </span>
        <span className="flex items-center gap-1.5">
          <NovaScore nova={item.nova} className="h-7" />
          <NutriScore score={item.nutriscore} className="h-7" />
        </span>
      </div>
    </Link>
  );
}

function Photo({ photo, name }: { photo: string | null; name: string }) {
  if (photo) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- locally cached
         images served from the /img route; not a remote next/image source. */
      <img
        src={`/img/${photo}`}
        alt=""
        className="aspect-square w-full rounded-md object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex aspect-square w-full items-center justify-center rounded-md bg-surface-elevated"
    >
      <span className="text-4xl font-semibold text-charcoal">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
