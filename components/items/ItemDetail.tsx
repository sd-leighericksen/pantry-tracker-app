"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, X } from "@phosphor-icons/react";

import type { ItemDetail as ItemDetailType } from "@/lib/items";
import type { CategoryOption, StoreOption } from "@/lib/items";
import type { ItemInsights, ItemEvent } from "@/lib/insights";
import { NUTRIMENT_ROWS } from "@/lib/nutrition";
import { NutriScore } from "@/components/NutriScore";
import { NovaScore } from "@/components/NovaScore";
import {
  addBarcodeAction,
  addToListAction,
  adjustItemQtyAction,
  archiveItemAction,
  refreshFromOffAction,
  removeBarcodeAction,
  updateItemAction,
} from "@/app/items/actions";

const inputClass =
  "h-11 w-full rounded-md border border-hairline-strong bg-surface-card px-3.5 text-ink outline-none transition-colors placeholder:text-ash focus-visible:border-ink";

export function ItemDetail({
  item,
  categories,
  stores,
  insights,
  events,
}: {
  item: ItemDetailType;
  categories: CategoryOption[];
  stores: StoreOption[];
  insights: ItemInsights;
  events: ItemEvent[];
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(item.quantity);
  const [name, setName] = useState(item.name);
  const [brand, setBrand] = useState(item.brand ?? "");
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [threshold, setThreshold] = useState(item.threshold);
  const [sizeText, setSizeText] = useState(item.sizeText ?? "");
  const [shelfLife, setShelfLife] = useState(
    item.defaultShelfLifeDays?.toString() ?? "",
  );
  const [notes, setNotes] = useState(item.notes ?? "");
  const [storeIds, setStoreIds] = useState<number[]>(item.storeIds);
  const [pinned, setPinned] = useState(item.pinned);
  const [icon, setIcon] = useState(item.icon ?? "");
  const [barcodes, setBarcodes] = useState<string[]>(item.barcodes);
  const [newBarcode, setNewBarcode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function adjust(delta: number) {
    startTransition(async () => {
      const res = await adjustItemQtyAction(item.id, delta);
      if (res.ok && typeof res.quantity === "number") setQuantity(res.quantity);
    });
  }

  function save(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const res = await updateItemAction(item.id, {
        name,
        brand: brand || null,
        categoryId,
        threshold,
        defaultShelfLifeDays: shelfLife.trim() ? Number(shelfLife) : null,
        notes: notes || null,
        pinned,
        icon: icon || null,
        sizeText: sizeText || null,
        storeIds,
        preferredStoreId: null,
      });
      setStatus(res.ok ? "Saved" : (res.error ?? "Could not save"));
    });
  }

  function addBarcode() {
    const code = newBarcode.trim();
    if (!code) return;
    startTransition(async () => {
      const res = await addBarcodeAction(item.id, code);
      if (res.ok) {
        setBarcodes((b) => [...b, code]);
        setNewBarcode("");
        setStatus(null);
      } else setStatus(res.error ?? "Could not add barcode");
    });
  }

  function removeBarcode(code: string) {
    startTransition(async () => {
      await removeBarcodeAction(item.id, code);
      setBarcodes((b) => b.filter((c) => c !== code));
    });
  }

  function archive() {
    if (!confirm(`Archive "${item.name}"? It will leave the inventory.`)) return;
    startTransition(async () => {
      await archiveItemAction(item.id);
      router.push("/inventory");
    });
  }

  function addToList() {
    startTransition(async () => {
      await addToListAction(item.id);
      setStatus("Added to shopping list");
    });
  }

  function refreshFromOff() {
    setStatus("Searching Open Food Facts…");
    startTransition(async () => {
      const res = await refreshFromOffAction(item.id);
      if (res.ok && res.status === "updated") {
        setStatus("Refreshed from Open Food Facts");
        router.refresh();
      } else if (res.ok && res.status === "not-found") {
        setStatus("No match on Open Food Facts");
      } else if (res.ok) {
        setStatus("No barcode to search with");
      } else {
        setStatus(res.error);
      }
    });
  }

  function toggleStore(id: number) {
    setStoreIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/inventory"
            aria-label="Back to inventory"
            className="flex size-11 shrink-0 items-center justify-center rounded-md border border-hairline-strong bg-surface-card text-ink"
          >
            <ArrowLeft size={20} />
          </Link>
          {item.photo && (
            /* eslint-disable-next-line @next/next/no-img-element -- cached local image */
            <img
              src={`/img/${item.photo}`}
              alt=""
              className="size-14 shrink-0 rounded-md object-cover"
            />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight text-ink">
              {item.name}
            </h1>
            <p className="flex items-center gap-2 text-sm text-charcoal">
              {item.categoryName}
              {item.sizeText && <span>· {item.sizeText}</span>}
            </p>
            <div className="mt-3 flex items-center gap-5">
              <NutriScore score={item.nutriscore} className="h-10" />
              <NovaScore nova={item.nova} className="h-10" />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={addToList}
            disabled={pending}
            className="h-9 rounded-md border border-hairline-strong px-4 text-sm text-ink disabled:opacity-50"
          >
            Add to list
          </button>
          <button
            type="button"
            onClick={archive}
            className="h-9 rounded-md border border-hairline-strong px-4 text-sm text-danger"
          >
            Archive
          </button>
        </div>
      </header>

      {/* Quantity */}
      <section className="flex items-center justify-between rounded-lg border border-hairline-strong bg-surface-elevated p-4">
        <span className="text-sm text-charcoal">In stock</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => adjust(-1)}
            disabled={pending || quantity <= 0}
            className="flex size-12 items-center justify-center rounded-md border border-hairline-strong text-ink disabled:opacity-40"
          >
            <Minus size={20} />
          </button>
          <span className="w-12 text-center font-mono text-3xl tabular-nums text-ink">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => adjust(1)}
            disabled={pending}
            className="flex size-12 items-center justify-center rounded-md border border-hairline-strong text-ink disabled:opacity-40"
          >
            <Plus size={20} />
          </button>
        </div>
      </section>

      {/* Nutrition / ingredients / allergens (imported, read-only) */}
      {(item.nutriments || item.ingredients || item.allergens) && (
        <section className="flex flex-col gap-4 rounded-lg border border-hairline bg-surface-card p-4">
          {item.nutriments && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-charcoal">
                Nutrition <span className="text-mute">per 100g</span>
              </h2>
              <dl className="flex flex-col">
                {NUTRIMENT_ROWS.map(({ key, label, unit }) => {
                  const v = item.nutriments![key];
                  if (v === undefined) return null;
                  return (
                    <div
                      key={key}
                      className="flex justify-between border-b border-divider-soft py-1.5 text-sm last:border-0"
                    >
                      <dt className="text-body">{label}</dt>
                      <dd className="font-mono tabular-nums text-ink">
                        {v}
                        {unit === "kcal" ? " kcal" : ` ${unit}`}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
          {item.allergens && (
            <div>
              <h2 className="mb-1 text-sm font-medium text-charcoal">Allergens</h2>
              <p className="text-sm capitalize text-body">{item.allergens}</p>
            </div>
          )}
          {item.ingredients && (
            <div>
              <h2 className="mb-1 text-sm font-medium text-charcoal">Ingredients</h2>
              <p className="text-sm leading-relaxed text-body">{item.ingredients}</p>
            </div>
          )}
        </section>
      )}

      {/* Edit form */}
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Brand">
            <input className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Category">
            <select
              className={`${inputClass} appearance-none`}
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Size">
          <input
            className={inputClass}
            value={sizeText}
            onChange={(e) => setSizeText(e.target.value)}
            placeholder='e.g. "1 kg", "320 g", "1L"'
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Low-stock threshold">
            <input
              className={`${inputClass} font-mono tabular-nums`}
              inputMode="numeric"
              value={String(threshold)}
              onChange={(e) => setThreshold(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
            />
          </Field>
          <Field label="Default shelf life (days)">
            <input
              className={`${inputClass} font-mono tabular-nums`}
              inputMode="numeric"
              value={shelfLife}
              onChange={(e) => setShelfLife(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Optional"
            />
          </Field>
        </div>

        {stores.length > 0 && (
          <Field label="Available at">
            <div className="flex flex-wrap gap-2">
              {stores.map((s) => {
                const on = storeIds.includes(s.id);
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => toggleStore(s.id)}
                    aria-pressed={on}
                    className={`flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                      on
                        ? "border-transparent bg-surface-elevated text-ink"
                        : "border-hairline-strong bg-surface-card text-charcoal"
                    }`}
                  >
                    <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.colour }} />
                    {s.name}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="size-5 accent-[var(--color-accent)]"
            />
            <span className="text-sm text-charcoal">Pin to kiosk home</span>
          </label>
          {pinned && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-charcoal">Emoji</span>
              <input
                className={`${inputClass} w-20 text-center text-xl`}
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                placeholder="🍌"
              />
            </label>
          )}
        </div>

        <Field label="Notes">
          <textarea
            className={`${inputClass} h-auto min-h-[44px] resize-y py-2.5`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional"
          />
        </Field>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="flex h-11 items-center justify-center rounded-md bg-accent px-6 font-medium text-accent-on transition-opacity disabled:opacity-50"
          >
            Save changes
          </button>
          {status && (
            <span className={status === "Saved" ? "text-sm text-accent" : "text-sm text-danger"}>
              {status}
            </span>
          )}
        </div>
      </form>

      {/* Barcodes */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-charcoal">Barcodes</h2>
          {barcodes.length > 0 && (
            <button
              type="button"
              onClick={refreshFromOff}
              disabled={pending}
              className="h-9 rounded-md border border-hairline-strong px-4 text-xs font-medium text-ink disabled:opacity-50"
            >
              Refresh from Open Food Facts
            </button>
          )}
        </div>
        {barcodes.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {barcodes.map((code) => (
              <li
                key={code}
                className="flex items-center justify-between rounded-md border border-hairline bg-surface-card px-3 py-2"
              >
                <span className="font-mono tabular-nums text-body">{code}</span>
                <button
                  type="button"
                  aria-label={`Remove ${code}`}
                  onClick={() => removeBarcode(code)}
                  className="flex size-8 items-center justify-center rounded text-charcoal"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-charcoal">
            No barcodes. Add one for packaging redesigns of the same product.
          </p>
        )}
        <div className="flex gap-2">
          <input
            className={`${inputClass} font-mono tabular-nums`}
            inputMode="numeric"
            value={newBarcode}
            onChange={(e) => setNewBarcode(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Add barcode…"
            aria-label="Add barcode"
          />
          <button
            type="button"
            onClick={addBarcode}
            disabled={pending || !newBarcode.trim()}
            className="h-11 shrink-0 rounded-md bg-surface-elevated px-5 text-sm font-medium text-ink transition-opacity disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </section>

      <InsightsSection insights={insights} onApply={setThreshold} />

      {events.length > 0 && <Activity events={events} />}
    </div>
  );
}

function InsightsSection({
  insights,
  onApply,
}: {
  insights: ItemInsights;
  onApply: (n: number) => void;
}) {
  const { lastBoughtAt, avgIntervalDays, avgWeeklyUse, suggestedThreshold } =
    insights;
  const hasAny =
    lastBoughtAt !== null || avgIntervalDays !== null || avgWeeklyUse !== null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-charcoal">Insights</h2>
      {!hasAny ? (
        <p className="text-sm text-charcoal">
          Not enough history yet — insights appear as you scan this item in and
          out.
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-3">
          <Stat label="Last bought" value={relativeDay(lastBoughtAt)} />
          <Stat
            label="Buy interval"
            value={
              avgIntervalDays !== null
                ? `every ${Math.round(avgIntervalDays)} days`
                : "—"
            }
          />
          <Stat
            label="Used"
            value={
              avgWeeklyUse !== null
                ? `~${avgWeeklyUse.toFixed(1)}/week`
                : "—"
            }
          />
          <Stat
            label="Bought / used"
            value={`${insights.totalIn} / ${insights.totalOut}`}
          />
        </dl>
      )}
      {suggestedThreshold !== null && (
        <button
          type="button"
          onClick={() => onApply(suggestedThreshold)}
          className="self-start rounded-md border border-hairline-strong px-4 py-2 text-sm text-ink"
        >
          Suggested threshold: {suggestedThreshold} — apply
        </button>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-surface-card p-3">
      <dt className="text-xs text-charcoal">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  "scan-in": "Scanned in",
  "scan-out": "Used",
  "quick-add": "Quick add",
  "quick-use": "Quick use",
  waste: "Wasted",
  manual: "Manual",
  ai: "AI",
};

function Activity({ events }: { events: ItemEvent[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-charcoal">Recent activity</h2>
      <ul className="flex flex-col gap-1.5">
        {events.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between text-sm text-body"
          >
            <span>
              {SOURCE_LABEL[e.source] ?? e.source}
              <span className="ml-2 text-charcoal">{relativeDay(e.createdAt)}</span>
            </span>
            <span
              className={`font-mono tabular-nums ${
                e.delta > 0 ? "text-accent" : "text-charcoal"
              }`}
            >
              {e.delta > 0 ? `+${e.delta}` : e.delta}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function relativeDay(ms: number | null): string {
  if (ms === null) return "—";
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ms).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-charcoal">{label}</span>
      {children}
    </label>
  );
}
