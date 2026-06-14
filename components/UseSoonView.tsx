import Link from "next/link";

import type { UseSoonEntry } from "@/lib/expiry";

/* Use Soon (BRIEF §5.4): on-hand stock expiring within the window, soonest
 * first, with expired items flagged distinctly. */

export function UseSoonView({ entries }: { entries: UseSoonEntry[] }) {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[40px] font-semibold leading-none tracking-tight text-ink">
          Use Soon
        </h1>
        <p className="mt-2 text-sm text-charcoal">
          On hand and expiring — oldest first.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline-strong text-center">
          <p className="text-ink">Nothing expiring soon</p>
          <p className="text-sm text-charcoal">
            Items with a shelf life show up here as they approach their date.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((e, i) => (
            <ExpiryRow key={`${e.itemId}-${e.expiry}-${i}`} entry={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ExpiryRow({ entry }: { entry: UseSoonEntry }) {
  const label = entry.expired
    ? entry.daysLeft === -1
      ? "Expired yesterday"
      : `Expired ${-entry.daysLeft} days ago`
    : entry.daysLeft === 0
      ? "Today"
      : entry.daysLeft === 1
        ? "Tomorrow"
        : `In ${entry.daysLeft} days`;

  return (
    <Link
      href={`/items/${entry.itemId}`}
      className={`flex items-center gap-4 rounded-lg border bg-surface-card p-3 ${
        entry.expired ? "border-danger" : "border-warning/40"
      }`}
    >
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-elevated">
        {entry.photo ? (
          /* eslint-disable-next-line @next/next/no-img-element -- cached local image */
          <img src={`/img/${entry.photo}`} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-lg font-semibold text-charcoal">
            {entry.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-ink">{entry.name}</p>
        <p className="text-sm text-charcoal">
          {new Date(entry.expiry).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>
      {entry.quantity > 1 && (
        <span className="font-mono text-sm tabular-nums text-charcoal">
          ×{entry.quantity}
        </span>
      )}
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
          entry.expired ? "bg-danger text-ink" : "bg-warning text-on-light"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
