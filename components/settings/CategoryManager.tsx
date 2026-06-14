"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Trash } from "@phosphor-icons/react";

import type { CategoryOption } from "@/lib/items";
import {
  createCategoryAction,
  deleteCategoryAction,
  renameCategoryAction,
} from "@/app/settings/actions";

export function CategoryManager({ categories }: { categories: CategoryOption[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createCategoryAction(name);
      if (res.ok) setName("");
      else setError(res.error ?? "Could not add.");
    });
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-medium text-ink">Categories</h2>
        <p className="mt-1 text-sm text-charcoal">
          Where items live — Pantry, Fridge, Freezer, and so on.
        </p>
      </div>

      <form onSubmit={add} className="flex items-end gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-charcoal">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Drinks Cupboard"
            className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3.5 text-ink outline-none focus-visible:border-ink"
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
        {categories.length === 0 ? (
          <li className="text-sm text-charcoal">No categories yet.</li>
        ) : (
          categories.map((c) => (
            /* Re-mounts (re-seeds the input) when the server-side name changes. */
            <CategoryRow key={`${c.id}-${c.name}`} category={c} />
          ))
        )}
      </ul>
    </section>
  );
}

function CategoryRow({ category }: { category: CategoryOption }) {
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = name.trim() !== category.name && name.trim() !== "";

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await renameCategoryAction(category.id, name);
      if (!res.ok) setError(res.error ?? "Could not rename.");
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await deleteCategoryAction(category.id);
      if (!res.ok) setError(res.error ?? "Could not remove.");
    });
  }

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 flex-1 rounded-md border border-hairline bg-surface-card px-3.5 text-ink outline-none focus-visible:border-ink"
        />
        {dirty && (
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="h-11 rounded-md bg-surface-elevated px-4 text-sm font-medium text-ink disabled:opacity-50"
          >
            Save
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={`Remove ${category.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-danger disabled:opacity-50"
        >
          <Trash size={18} />
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </li>
  );
}
