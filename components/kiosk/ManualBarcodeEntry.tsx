"use client";

import { useState, type FormEvent } from "react";

/* Manual barcode entry — bypasses the wedge listener entirely. Doubles as the
 * accessibility path and the no-hardware test path (barcode-scanner-wedge
 * skill: "a small type-barcode input that bypasses the wedge"). */

export function ManualBarcodeEntry({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (code: string) => void;
}) {
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const code = value.trim();
    if (!code) return;
    onSubmit(code);
    setValue("");
  }

  return (
    <form onSubmit={submit} className="flex gap-3">
      <input
        inputMode="numeric"
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
        placeholder={disabled ? "Arm a mode to scan" : "Type a barcode…"}
        aria-label="Manual barcode entry"
        className="h-11 flex-1 rounded-md border border-hairline-strong bg-surface-card px-3.5 font-mono tabular-nums text-ink outline-none transition-colors placeholder:text-ash focus-visible:border-ink disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || value.trim().length === 0}
        className="h-11 rounded-md bg-surface-elevated px-5 text-sm font-medium text-ink transition-opacity disabled:opacity-50"
      >
        Enter
      </button>
    </form>
  );
}
