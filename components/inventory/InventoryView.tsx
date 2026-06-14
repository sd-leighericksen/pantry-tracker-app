"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GridFour, ListBullets, MagnifyingGlass } from "@phosphor-icons/react";

import type { InventoryItem } from "@/lib/inventory";
import type { CategoryOption, StoreOption } from "@/lib/items";
import { NutriBadge } from "@/components/NutriBadge";
import { ProductCard } from "@/components/inventory/ProductCard";

const NUTRI_LETTERS = ["a", "b", "c", "d", "e"] as const;

function matchesQuery(item: InventoryItem, q: string): boolean {
  if (!q) return true;
  const haystack = `${item.name} ${item.brand ?? ""} ${item.categoryName}`.toLowerCase();
  /* Every whitespace-separated token must appear. */
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function InventoryView({
  items,
  categories,
  stores,
}: {
  items: InventoryItem[];
  categories: CategoryOption[];
  stores: StoreOption[];
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [storeIds, setStoreIds] = useState<number[]>([]);
  const [nutri, setNutri] = useState<string[]>([]);
  const [lowOnly, setLowOnly] = useState(false);
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (categoryId === null || item.categoryId === categoryId) &&
          (storeIds.length === 0 ||
            item.storeIds.some((id) => storeIds.includes(id))) &&
          (nutri.length === 0 ||
            (item.nutriscore !== null && nutri.includes(item.nutriscore))) &&
          (!lowOnly || item.lowStock) &&
          (!expiringOnly || item.expired || item.expiringSoon) &&
          matchesQuery(item, query),
      ),
    [items, categoryId, storeIds, nutri, lowOnly, expiringOnly, query],
  );

  const expiringCount = items.filter((i) => i.expired || i.expiringSoon).length;

  const toggle = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const lowCount = items.filter((i) => i.lowStock).length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Inventory
          <span className="ml-3 font-mono text-lg tabular-nums text-charcoal">
            {filtered.length}
          </span>
        </h1>
        <div className="flex items-center gap-1 rounded-md border border-hairline-strong p-1">
          <ViewButton active={view === "grid"} onClick={() => setView("grid")} label="Grid">
            <GridFour size={20} />
          </ViewButton>
          <ViewButton active={view === "list"} onClick={() => setView("list")} label="List">
            <ListBullets size={20} />
          </ViewButton>
        </div>
      </header>

      {expiringCount > 0 && (
        <Link
          href="/use-soon"
          className="flex items-center justify-between rounded-lg border border-warning/40 bg-surface-card px-4 py-3 text-sm text-ink"
        >
          <span>
            <span className="font-mono tabular-nums">{expiringCount}</span> item
            {expiringCount === 1 ? "" : "s"} to use soon
          </span>
          <span className="text-charcoal">View →</span>
        </Link>
      )}

      <label className="relative block">
        <MagnifyingGlass
          size={20}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ash"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items…"
          aria-label="Search inventory"
          className="h-12 w-full rounded-md border border-hairline-strong bg-surface-card pl-11 pr-4 text-ink outline-none transition-colors placeholder:text-ash focus-visible:border-ink"
        />
      </label>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <ChipRow>
          <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.id}
              active={categoryId === c.id}
              onClick={() => setCategoryId((v) => (v === c.id ? null : c.id))}
            >
              {c.name}
            </Chip>
          ))}
        </ChipRow>

        <ChipRow>
          <Chip active={lowOnly} onClick={() => setLowOnly((v) => !v)} tone="danger">
            Low stock
            {lowCount > 0 && (
              <span className="ml-1.5 font-mono tabular-nums">{lowCount}</span>
            )}
          </Chip>
          {expiringCount > 0 && (
            <Chip
              active={expiringOnly}
              onClick={() => setExpiringOnly((v) => !v)}
              tone="danger"
            >
              Expiring
              <span className="ml-1.5 font-mono tabular-nums">{expiringCount}</span>
            </Chip>
          )}
          <span className="mx-1 w-px self-stretch bg-hairline" />
          {NUTRI_LETTERS.map((letter) => (
            <button
              key={letter}
              type="button"
              aria-pressed={nutri.includes(letter)}
              onClick={() => setNutri((v) => toggle(v, letter))}
              className={`transition-opacity ${nutri.includes(letter) ? "" : "opacity-45"}`}
            >
              <NutriBadge score={letter} />
            </button>
          ))}
          {stores.length > 0 && (
            <span className="mx-1 w-px self-stretch bg-hairline" />
          )}
          {stores.map((s) => (
            <Chip
              key={s.id}
              active={storeIds.includes(s.id)}
              onClick={() => setStoreIds((v) => toggle(v, s.id))}
            >
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: s.colour }}
              />
              {s.name}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState hasItems={items.length > 0} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <ProductRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductRow({ item }: { item: InventoryItem }) {
  return (
    <Link
      href={`/items/${item.id}`}
      className={`flex items-center gap-4 rounded-lg border bg-surface-card p-3 ${
        item.lowStock ? "border-danger" : "border-hairline"
      }`}
    >
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-elevated">
        {item.photo ? (
          /* eslint-disable-next-line @next/next/no-img-element -- cached local image */
          <img src={`/img/${item.photo}`} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-lg font-semibold text-charcoal">
            {item.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-ink">{item.name}</p>
        <p className="truncate text-sm text-charcoal">
          {item.brand ?? item.categoryName}
        </p>
      </div>
      {item.nutriscore && <NutriBadge score={item.nutriscore} />}
      <span
        className={`w-8 text-right font-mono text-lg tabular-nums ${
          item.lowStock ? "text-danger" : "text-ink"
        }`}
      >
        {item.quantity}
      </span>
    </Link>
  );
}

function EmptyState({ hasItems }: { hasItems: boolean }) {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline-strong text-center">
      <p className="text-ink">
        {hasItems ? "No items match these filters" : "No items yet"}
      </p>
      <p className="text-sm text-charcoal">
        {hasItems
          ? "Adjust the search or filters."
          : "Scan something in or add an item to get started."}
      </p>
    </div>
  );
}

/* --------------------------- small controls -------------------------- */

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  );
}

function Chip({
  active,
  onClick,
  tone = "default",
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  const activeClass =
    tone === "danger"
      ? "border-danger bg-surface-card text-danger"
      : "border-transparent bg-surface-elevated text-ink";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors ${
        active ? activeClass : "border-hairline-strong bg-surface-card text-charcoal"
      }`}
    >
      {children}
    </button>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label} view`}
      className={`flex size-9 items-center justify-center rounded ${
        active ? "bg-surface-elevated text-ink" : "text-charcoal"
      }`}
    >
      {children}
    </button>
  );
}
