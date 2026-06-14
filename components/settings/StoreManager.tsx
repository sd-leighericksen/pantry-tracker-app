"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Trash } from "@phosphor-icons/react";

import type { StoreOption } from "@/lib/items";
import { createStoreAction, deleteStoreAction } from "@/app/settings/actions";

export function StoreManager({ stores }: { stores: StoreOption[] }) {
  const [name, setName] = useState("");
  const [colour, setColour] = useState("#888e90");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createStoreAction(name, colour);
      if (res.ok) {
        setName("");
        setColour("#888e90");
      } else {
        setError(res.error ?? "Could not add.");
      }
    });
  }

  function remove(id: number, label: string) {
    if (
      !confirm(
        `Remove "${label}"? It will be detached from any items and shopping rows.`,
      )
    )
      return;
    startTransition(() => deleteStoreAction(id));
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-medium text-ink">Stores</h2>
        <p className="mt-1 text-sm text-charcoal">
          Where you shop. Used to group the shopping list and tag items.
        </p>
      </div>

      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-charcoal">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Costco"
            className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3.5 text-ink outline-none focus-visible:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-charcoal">Colour</span>
          <input
            type="color"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            aria-label="Store colour"
            className="h-11 w-14 cursor-pointer rounded-md border border-hairline-strong bg-surface-card"
          />
        </label>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="h-11 rounded-md bg-accent px-5 font-medium text-accent-on transition-opacity disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      <ul className="flex flex-col gap-2">
        {stores.length === 0 ? (
          <li className="text-sm text-charcoal">No stores yet.</li>
        ) : (
          stores.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-surface-card px-4 py-3"
            >
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="size-3 rounded-full"
                  style={{ backgroundColor: s.colour }}
                />
                <span className="text-ink">{s.name}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(s.id, s.name)}
                aria-label={`Remove ${s.name}`}
                className="flex size-9 items-center justify-center rounded-md text-danger"
              >
                <Trash size={18} />
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
