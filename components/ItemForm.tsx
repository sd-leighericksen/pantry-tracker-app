"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Minus, Plus } from "@phosphor-icons/react";

import type { CategoryOption, StoreOption, CreatedItem } from "@/lib/items";
import type { Nutriments } from "@/lib/nutrition";
import { createItemManualAction } from "@/app/items/actions";

/* Reusable manual item entry form (BRIEF §5.2 path 3, DESIGN.md inputs).
 * Rendered both in the kiosk add-modal and on the standalone /items/new route.
 * Preferred store defaults to the first selected store (a dedicated picker is
 * a later refinement once the shopping list needs it). */

type Props = {
  categories: CategoryOption[];
  stores: StoreOption[];
  /** Pre-filled, read-only barcode when launched from an unknown scan. */
  barcode?: string | null;
  /** Pre-filled values (e.g. from AI photo capture). The rich fields
   * (ingredients/allergens/nutriments) are carried through to creation
   * without a UI — they're imported, shown read-only on the item detail. */
  initial?: {
    name?: string | null;
    brand?: string | null;
    categoryId?: number;
    sizeText?: string | null;
    ingredients?: string | null;
    allergens?: string | null;
    nutriments?: Nutriments | null;
  };
  /** Cached photo path to attach to the new item (e.g. user/<id>.jpg). */
  photo?: string | null;
  onCreated: (item: CreatedItem) => void;
  onCancel?: () => void;
};

const inputClass =
  "h-11 w-full rounded-md border border-hairline-strong bg-surface-card px-3.5 text-ink outline-none transition-colors placeholder:text-ash focus-visible:border-ink";

export function ItemForm({
  categories,
  stores,
  barcode,
  initial,
  photo,
  onCreated,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [categoryId, setCategoryId] = useState<number>(
    initial?.categoryId ?? categories[0]?.id ?? 0,
  );
  const [sizeText, setSizeText] = useState(initial?.sizeText ?? "");
  const [threshold, setThreshold] = useState(0);
  const [shelfLife, setShelfLife] = useState("");
  const [notes, setNotes] = useState("");
  const [storeIds, setStoreIds] = useState<number[]>([]);
  const [pinned, setPinned] = useState(false);
  const [icon, setIcon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleStore(id: number) {
    setStoreIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      const res = await createItemManualAction({
        name,
        brand,
        categoryId,
        threshold,
        defaultShelfLifeDays: shelfLife.trim() ? Number(shelfLife) : null,
        notes,
        storeIds,
        barcode: barcode ?? null,
        pinned,
        icon: icon || null,
        photo: photo ?? null,
        sizeText: sizeText || null,
        ingredients: initial?.ingredients ?? null,
        allergens: initial?.allergens ?? null,
        nutriments: initial?.nutriments ?? null,
      });
      if (res.ok) onCreated(res.item);
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {photo && (
        /* eslint-disable-next-line @next/next/no-img-element -- cached local image */
        <img
          src={`/img/${photo}`}
          alt=""
          className="aspect-square w-32 rounded-md object-cover"
        />
      )}
      {barcode && (
        <p className="text-sm text-charcoal">
          Barcode{" "}
          <span className="font-mono tabular-nums text-body">{barcode}</span>
        </p>
      )}

      <Field label="Name">
        <input
          className={inputClass}
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Tinned Tomatoes"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Brand">
          <input
            className={inputClass}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Optional"
          />
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
          <Stepper value={threshold} onChange={setThreshold} />
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
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: s.colour }}
                  />
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
              aria-label="Tile emoji"
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

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-2 flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 flex-1 items-center justify-center rounded-md bg-accent px-5 font-medium text-accent-on transition-opacity disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add item"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-md border border-hairline-strong px-5 text-ink"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-charcoal">{label}</span>
      {children}
    </label>
  );
}

function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex h-11 items-center justify-between rounded-md border border-hairline-strong bg-surface-elevated px-2">
      <StepperButton label="Decrease" onClick={() => onChange(Math.max(0, value - 1))}>
        <Minus size={18} />
      </StepperButton>
      <span className="font-mono text-lg tabular-nums text-ink">{value}</span>
      <StepperButton label="Increase" onClick={() => onChange(value + 1)}>
        <Plus size={18} />
      </StepperButton>
    </div>
  );
}

function StepperButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-md text-ink"
    >
      {children}
    </button>
  );
}
