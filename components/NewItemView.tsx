"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react";

import type { CategoryOption, StoreOption, CreatedItem } from "@/lib/items";
import { ItemForm } from "@/components/ItemForm";

/* Standalone manual entry (mobile/desktop). On the kiosk the same ItemForm is
 * rendered inside the scan modal instead. */
export function NewItemView({
  categories,
  stores,
  barcode,
}: {
  categories: CategoryOption[];
  stores: StoreOption[];
  barcode?: string | null;
}) {
  const [created, setCreated] = useState<CreatedItem[]>([]);
  const [formKey, setFormKey] = useState(0);

  function onCreated(item: CreatedItem) {
    setCreated((prev) => [item, ...prev]);
    setFormKey((k) => k + 1); // reset the form for another entry
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Add item
        </h1>
        <Link href="/" className="text-sm text-charcoal underline-offset-2 hover:underline">
          Done
        </Link>
      </header>

      <Link
        href="/items/capture"
        className="flex items-center justify-between rounded-lg border border-hairline-strong bg-surface-card px-4 py-3 text-sm text-ink"
      >
        <span>Add by photo instead</span>
        <span className="text-charcoal">Camera →</span>
      </Link>

      {created.length > 0 && (
        <div className="rounded-lg border border-hairline bg-surface-card p-4">
          <p className="mb-2 flex items-center gap-2 text-sm text-ink">
            <CheckCircle size={18} weight="fill" className="text-accent" />
            Added {created.length} {created.length === 1 ? "item" : "items"}
          </p>
          <ul className="flex flex-col gap-1 text-sm text-charcoal">
            {created.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        </div>
      )}

      <ItemForm
        key={formKey}
        categories={categories}
        stores={stores}
        barcode={barcode}
        onCreated={onCreated}
      />
    </div>
  );
}
