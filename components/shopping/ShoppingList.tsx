"use client";

import {
  useMemo,
  useOptimistic,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Check, X } from "@phosphor-icons/react";

import type { ShoppingEntry } from "@/lib/shopping";
import type { StoreOption } from "@/lib/items";
import {
  addFreeTextAction,
  completeShopAction,
  removeItemAction,
  tickItemAction,
} from "@/app/shopping/actions";

type OptimisticAction =
  | { type: "tick"; id: number; ticked: boolean }
  | { type: "remove"; id: number }
  | { type: "complete" };

function reduce(state: ShoppingEntry[], action: OptimisticAction): ShoppingEntry[] {
  switch (action.type) {
    case "tick":
      return state.map((e) =>
        e.id === action.id ? { ...e, status: action.ticked ? "ticked" : "pending" } : e,
      );
    case "remove":
      return state.filter((e) => e.id !== action.id);
    case "complete":
      return state.filter((e) => e.status !== "ticked");
  }
}

export function ShoppingList({
  entries,
  stores,
}: {
  entries: ShoppingEntry[];
  stores: StoreOption[];
}) {
  const [optimistic, applyOptimistic] = useOptimistic(entries, reduce);
  const [view, setView] = useState<"store" | "flat">("store");
  const [, startTransition] = useTransition();

  const pendingCount = optimistic.filter((e) => e.status === "pending").length;
  const tickedCount = optimistic.filter((e) => e.status === "ticked").length;

  function onTick(id: number, ticked: boolean) {
    startTransition(async () => {
      applyOptimistic({ type: "tick", id, ticked });
      await tickItemAction(id, ticked);
    });
  }

  function onRemove(id: number) {
    startTransition(async () => {
      applyOptimistic({ type: "remove", id });
      await removeItemAction(id);
    });
  }

  function onComplete() {
    startTransition(async () => {
      applyOptimistic({ type: "complete" });
      await completeShopAction();
    });
  }

  /* Order groups by the store's own sort order; Unassigned sinks to the end. */
  const storeOrder = useMemo(() => {
    const m = new Map<number, number>();
    stores.forEach((s, i) => m.set(s.id, i));
    return m;
  }, [stores]);

  const groups = useMemo(() => {
    if (view === "flat") {
      return [{ key: "all", name: "All items", colour: null, entries: optimistic }];
    }
    const byStore = new Map<string, { name: string; colour: string | null; id: number | null; entries: ShoppingEntry[] }>();
    for (const e of optimistic) {
      const key = e.groupStoreId === null ? "none" : String(e.groupStoreId);
      let g = byStore.get(key);
      if (!g) {
        g = { name: e.groupStoreName, colour: e.groupStoreColour, id: e.groupStoreId, entries: [] };
        byStore.set(key, g);
      }
      g.entries.push(e);
    }
    return [...byStore.values()]
      .sort((a, b) => {
        const ao = a.id === null ? Infinity : (storeOrder.get(a.id) ?? Infinity);
        const bo = b.id === null ? Infinity : (storeOrder.get(b.id) ?? Infinity);
        return ao - bo;
      })
      .map((g) => ({ key: String(g.id), name: g.name, colour: g.colour, entries: g.entries }));
  }, [optimistic, view, storeOrder]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-[40px] font-semibold leading-none tracking-tight text-ink">
          Shopping
          <span className="ml-3 font-mono text-lg tabular-nums text-charcoal">
            {pendingCount}
          </span>
        </h1>
        <div className="flex items-center gap-1 rounded-md border border-hairline-strong p-1 text-sm">
          <Toggle active={view === "store"} onClick={() => setView("store")}>
            By store
          </Toggle>
          <Toggle active={view === "flat"} onClick={() => setView("flat")}>
            All
          </Toggle>
        </div>
      </header>

      <AddItem stores={stores} />

      {optimistic.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <Group key={g.key} name={g.name} colour={g.colour} entries={g.entries}>
              {sortEntries(g.entries).map((e) => (
                <Row
                  key={e.id}
                  entry={e}
                  showStore={view === "flat"}
                  onTick={onTick}
                  onRemove={onRemove}
                />
              ))}
            </Group>
          ))}
        </div>
      )}

      {tickedCount > 0 && (
        <button
          type="button"
          onClick={onComplete}
          className="mt-2 flex h-12 items-center justify-center rounded-lg bg-accent px-6 font-semibold text-accent-on"
        >
          Complete shop · clear {tickedCount}
        </button>
      )}
    </div>
  );
}

/* Pending first (by name), ticked sink to the bottom of their section. */
function sortEntries(entries: ShoppingEntry[]): ShoppingEntry[] {
  return [...entries].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function Group({
  name,
  colour,
  entries,
  children,
}: {
  name: string;
  colour: string | null;
  entries: ShoppingEntry[];
  children: React.ReactNode;
}) {
  const count = entries.length;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 px-1">
        {colour && (
          <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: colour }} />
        )}
        <h2 className="text-xl font-medium text-ink">{name}</h2>
        <span className="text-xs text-charcoal">
          · {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
      {children}
    </section>
  );
}

function Row({
  entry,
  showStore,
  onTick,
  onRemove,
}: {
  entry: ShoppingEntry;
  showStore: boolean;
  onTick: (id: number, ticked: boolean) => void;
  onRemove: (id: number) => void;
}) {
  const ticked = entry.status === "ticked";
  return (
    <div
      className={`flex h-16 items-center gap-3 rounded-lg border bg-surface-card px-3 ${
        ticked ? "border-divider-soft" : "border-hairline"
      }`}
    >
      <button
        type="button"
        onClick={() => onTick(entry.id, !ticked)}
        aria-pressed={ticked}
        aria-label={ticked ? "Untick" : "Tick off"}
        className="flex size-12 shrink-0 items-center justify-center"
      >
        <span
          className={`flex size-8 items-center justify-center rounded-full border ${
            ticked
              ? "border-transparent bg-accent text-accent-on"
              : "border-hairline-strong"
          }`}
        >
          {ticked && <Check size={18} weight="bold" />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-lg ${ticked ? "text-charcoal line-through" : "text-ink"}`}>
          {entry.name}
        </p>
        {entry.needed && !ticked && (
          <p className="text-sm text-charcoal">need {entry.needed}</p>
        )}
      </div>

      {!ticked && showStore && entry.groupStoreColour && (
        <StoreBadge name={entry.groupStoreName} colour={entry.groupStoreColour} />
      )}
      {!ticked && !showStore && entry.altStoreNames.length > 0 && (
        <span className="hidden shrink-0 text-xs text-charcoal sm:inline">
          also at {entry.altStoreNames.join(", ")}
        </span>
      )}

      <button
        type="button"
        onClick={() => onRemove(entry.id)}
        aria-label="Remove"
        className="flex size-11 shrink-0 items-center justify-center rounded-md text-charcoal"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function StoreBadge({ name, colour }: { name: string; colour: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-1 text-xs text-body">
      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: colour }} />
      {name}
    </span>
  );
}

function AddItem({ stores }: { stores: StoreOption[] }) {
  const [text, setText] = useState("");
  const [storeId, setStoreId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addFreeTextAction(text, storeId);
      if (res.ok) setText("");
      else setError(res.error ?? "Could not add.");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add an item…"
          aria-label="Add a shopping item"
          className="h-12 flex-1 rounded-md border border-hairline-strong bg-surface-card px-3.5 text-ink outline-none transition-colors placeholder:text-ash focus-visible:border-ink"
        />
        {stores.length > 0 && (
          <select
            value={storeId ?? ""}
            onChange={(e) => setStoreId(e.target.value ? Number(e.target.value) : null)}
            aria-label="Store"
            className="h-12 rounded-md border border-hairline-strong bg-surface-card px-3 text-ink outline-none"
          >
            <option value="">Any store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="h-12 rounded-md bg-surface-elevated px-5 font-medium text-ink transition-opacity disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

function Empty() {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline-strong text-center">
      <p className="text-ink">Nothing on the list</p>
      <p className="text-sm text-charcoal">
        Items appear here automatically when stock runs low.
      </p>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-8 items-center rounded px-3 ${
        active ? "bg-surface-elevated text-ink" : "text-charcoal"
      }`}
    >
      {children}
    </button>
  );
}
