"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SpeakerHigh, SpeakerSlash, Barcode } from "@phosphor-icons/react";

import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { scanAudio } from "@/lib/audio";
import type { ScanMode, ScanResult } from "@/lib/scan";
import type { CategoryOption, StoreOption } from "@/lib/items";
import type { QuickItem } from "@/lib/quick";
import {
  submitScan,
  resolveUnknown,
  quickAdjust,
  lookupItemId,
} from "@/app/kiosk/actions";
import { ScanModeToggles } from "@/components/kiosk/ScanModeToggles";
import { ScanToast, type ToastPayload } from "@/components/kiosk/ScanToast";
import { ManualBarcodeEntry } from "@/components/kiosk/ManualBarcodeEntry";
import { QuickAddTile } from "@/components/kiosk/QuickAddTile";
import { ItemForm } from "@/components/ItemForm";

/* Idle timeout: armed modes disarm themselves after inactivity (BRIEF §5.1,
 * default 10 min — will become a setting). */
const IDLE_MS = 10 * 60 * 1000;

type QueueEntry = {
  barcode: string;
  count: number;
  reason: "unknown" | "variable-weight";
  /** True when first seen during a scan-in (so resolving it adds 1 to stock). */
  incoming: boolean;
  /** Resolution state for the OFF lookup. */
  state?: "resolving" | "manual" | "error";
  note?: string;
};

export function ScanShell({
  categories,
  stores,
  pinned,
}: {
  categories: CategoryOption[];
  stores: StoreOption[];
  pinned: QuickItem[];
}) {
  const [mode, setMode] = useState<ScanMode | "idle">("idle");
  const [audioOn, setAudioOn] = useState(true);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [manualBarcode, setManualBarcode] = useState<string | null>(null);
  const [manualIncoming, setManualIncoming] = useState(false);
  const [tiles, setTiles] = useState<QuickItem[]>(pinned);
  const [, startTransition] = useTransition();
  const router = useRouter();

  /* Read the freshest mode/audio inside async scan callbacks without
   * re-binding the listener. */
  const modeRef = useRef<ScanMode | "idle">("idle");
  modeRef.current = mode;
  const audioRef = useRef(true);
  audioRef.current = audioOn;
  const nonce = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function resetIdle() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setMode("idle"), IDLE_MS);
  }

  function arm(next: ScanMode) {
    /* The arming tap is the audio-unlock gesture. */
    scanAudio.unlock();
    setMode((prev) => {
      const value = prev === next ? "idle" : next;
      if (value === "idle") {
        if (idleTimer.current) clearTimeout(idleTimer.current);
      } else {
        resetIdle();
      }
      return value;
    });
  }

  function play(tone: "success" | "out" | "error") {
    if (audioRef.current) scanAudio.play(tone);
  }

  function enqueue(
    barcode: string,
    reason: QueueEntry["reason"],
    incoming: boolean,
    state?: QueueEntry["state"],
  ) {
    setQueue((prev) => {
      const existing = prev.find((q) => q.barcode === barcode);
      if (existing) {
        return prev.map((q) =>
          q.barcode === barcode
            ? { ...q, count: q.count + 1, incoming: q.incoming || incoming }
            : q,
        );
      }
      return [...prev, { barcode, count: 1, reason, incoming, state }];
    });
  }

  function applyResult(res: ScanResult, scanMode: ScanMode) {
    const id = ++nonce.current;

    switch (res.status) {
      case "ok": {
        play(res.mode === "in" ? "success" : "out");
        setToast({
          nonce: id,
          kind: res.mode,
          title: res.item.name,
          subtitle: res.item.brand,
          photo: res.item.photo,
          quantity: res.item.quantity,
          nutriscore: res.item.nutriscore,
        });
        break;
      }
      case "unknown": {
        /* Reached only for scan-out of an unknown code (scan-in is handled in
         * handleScan, which auto-resolves via OFF). Nothing to remove. */
        play("error");
        enqueue(res.barcode, "unknown", false);
        setToast({
          nonce: id,
          kind: "unknown",
          title: "Unknown item",
          subtitle: `${res.barcode} · not in inventory`,
        });
        break;
      }
      case "variable-weight": {
        play("error");
        enqueue(res.barcode, "variable-weight", scanMode === "in");
        setToast({
          nonce: id,
          kind: "variable-weight",
          title: "Variable-weight item",
          subtitle: "Use a quick-add tile, not the scanner",
        });
        break;
      }
      case "zero-stock": {
        play("error");
        setToast({
          nonce: id,
          kind: "zero-stock",
          title: res.item.name,
          subtitle: "Already at 0 — nothing to scan out",
          quantity: 0,
        });
        break;
      }
      case "invalid": {
        play("error");
        setToast({
          nonce: id,
          kind: "invalid",
          title: "Unreadable barcode",
          subtitle: res.barcode || "—",
        });
        break;
      }
    }
  }

  function handleScan(code: string) {
    const m = modeRef.current;
    if (m === "idle") {
      /* Scan-to-lookup: a scan while disarmed opens the item's detail. */
      startTransition(async () => {
        const { itemId } = await lookupItemId(code);
        if (itemId) router.push(`/items/${itemId}`);
        else
          setToast({
            nonce: ++nonce.current,
            kind: "unknown",
            title: "Unknown",
            subtitle: `${code} — arm Scan In to add`,
          });
      });
      return;
    }
    resetIdle();
    startTransition(async () => {
      const res = await submitScan(code, m);
      /* Unknown while scanning in → look it up on OFF automatically (no
       * separate resolve step), and create+increment if found. */
      if (res.status === "unknown" && m === "in") {
        enqueue(code, "unknown", true, "resolving");
        setToast({
          nonce: ++nonce.current,
          kind: "unknown",
          title: "Looking up…",
          subtitle: code,
        });
        resolveOne(code, true);
        return;
      }
      applyResult(res, m);
    });
  }

  function resolveOne(barcode: string, incoming: boolean) {
    setQueue((prev) =>
      prev.map((q) =>
        q.barcode === barcode ? { ...q, state: "resolving", note: undefined } : q,
      ),
    );
    startTransition(async () => {
      const r = await resolveUnknown(barcode, incoming);
      if (r.status === "created") {
        setQueue((prev) => prev.filter((q) => q.barcode !== barcode));
        play("success");
        setToast({
          nonce: ++nonce.current,
          kind: "in",
          title: r.item.name ? `Added ${r.item.name}` : "Added to inventory",
          subtitle: barcode,
          quantity: r.quantity,
        });
      } else if (r.status === "not-found") {
        setQueue((prev) =>
          prev.map((q) =>
            q.barcode === barcode
              ? { ...q, state: "manual", note: "Not in Open Food Facts — add manually" }
              : q,
          ),
        );
      } else {
        setQueue((prev) =>
          prev.map((q) =>
            q.barcode === barcode
              ? { ...q, state: "error", note: r.message }
              : q,
          ),
        );
      }
    });
  }

  function onItemCreated(item: { id: number; name: string }) {
    const barcode = manualBarcode;
    const incoming = manualIncoming;
    setManualBarcode(null);
    setManualIncoming(false);
    if (barcode) setQueue((prev) => prev.filter((q) => q.barcode !== barcode));
    play("success");

    if (incoming) {
      /* Created off the back of a scan-in → it should land at 1, not 0. */
      startTransition(async () => {
        const res = await quickAdjust(item.id, 1, "scan-in");
        setToast({
          nonce: ++nonce.current,
          kind: "in",
          title: `Added ${item.name}`,
          subtitle: barcode ?? undefined,
          quantity: res.ok ? res.quantity : 1,
        });
      });
      return;
    }
    setToast({
      nonce: ++nonce.current,
      kind: "in",
      title: `Added ${item.name}`,
      subtitle: barcode ?? undefined,
    });
  }

  function openManual(barcode: string, incoming: boolean) {
    setManualIncoming(incoming);
    setManualBarcode(barcode);
  }

  function onTileTap(item: QuickItem) {
    const m = modeRef.current;
    if (m === "idle") {
      setToast({
        nonce: ++nonce.current,
        kind: "invalid",
        title: "Arm a mode first",
        subtitle: "In to add · Used / Wasted to remove",
      });
      return;
    }
    const delta = m === "in" ? 1 : -1;
    const source =
      m === "in" ? "quick-add" : m === "waste" ? "waste" : "quick-use";
    resetIdle();
    startTransition(async () => {
      const res = await quickAdjust(item.id, delta, source);
      if (!res.ok) return;
      setTiles((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, quantity: res.quantity } : t)),
      );
      play(m === "in" ? "success" : "out");
      setToast({
        nonce: ++nonce.current,
        kind: m,
        title: item.name,
        photo: item.photo,
        quantity: res.quantity,
      });
    });
  }

  /* Always live (so an idle scan can open an item's detail), except while the
   * add-item modal is open — a stray scan there mustn't fire behind it. */
  useBarcodeScanner({ onScan: handleScan, enabled: manualBarcode === null });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Barcode size={28} className="text-charcoal" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              Scan
            </h1>
            <p className="text-sm text-charcoal">
              {mode === "idle"
                ? "Arm a mode to begin"
                : mode === "in"
                  ? "Scanning in — each scan adds 1"
                  : mode === "waste"
                    ? "Scanning wasted — each scan removes 1"
                    : "Scanning used — each scan removes 1"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAudioOn((v) => !v)}
          aria-pressed={audioOn}
          aria-label={audioOn ? "Mute scan sounds" : "Unmute scan sounds"}
          className="flex size-11 items-center justify-center rounded-md border border-hairline-strong bg-surface-card text-ink"
        >
          {audioOn ? <SpeakerHigh size={20} /> : <SpeakerSlash size={20} />}
        </button>
      </header>

      <ScanModeToggles mode={mode} onArm={arm} />

      <div className="min-h-[13rem]">
        {toast ? (
          <ScanToast payload={toast} />
        ) : (
          <div className="flex min-h-[13rem] items-center justify-center rounded-xl border border-dashed border-hairline-strong text-charcoal">
            Scans appear here
          </div>
        )}
      </div>

      <ManualBarcodeEntry disabled={mode === "idle"} onSubmit={handleScan} />

      {tiles.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-charcoal">Quick add</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {tiles.map((t) => (
              <QuickAddTile key={t.id} item={t} onTap={onTileTap} />
            ))}
          </div>
        </section>
      )}

      {queue.length > 0 && (
        <QueuePanel
          queue={queue}
          onResolve={resolveOne}
          onManual={openManual}
          onClear={() => setQueue([])}
        />
      )}

      {manualBarcode !== null && (
        <ItemFormModal
          categories={categories}
          stores={stores}
          barcode={manualBarcode}
          onCreated={onItemCreated}
          onCancel={() => setManualBarcode(null)}
        />
      )}
    </div>
  );
}

function ItemFormModal({
  categories,
  stores,
  barcode,
  onCreated,
  onCancel,
}: {
  categories: CategoryOption[];
  stores: StoreOption[];
  barcode: string;
  onCreated: (item: { id: number; name: string }) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="max-h-[90dvh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-hairline-strong bg-surface-card p-6">
        <h2 className="mb-5 text-2xl font-semibold tracking-tight text-ink">
          Add item
        </h2>
        <ItemForm
          categories={categories}
          stores={stores}
          barcode={barcode}
          onCreated={onCreated}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}

function QueuePanel({
  queue,
  onResolve,
  onManual,
  onClear,
}: {
  queue: QueueEntry[];
  onResolve: (barcode: string, incoming: boolean) => void;
  onManual: (barcode: string, incoming: boolean) => void;
  onClear: () => void;
}) {
  const total = queue.reduce((n, q) => n + q.count, 0);
  return (
    <section className="rounded-lg border border-hairline bg-surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">
          To resolve
          <span className="ml-2 font-mono tabular-nums text-charcoal">
            {total}
          </span>
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-charcoal underline-offset-2 hover:underline"
        >
          Clear
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {queue.map((q) => (
          <li
            key={q.barcode}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="min-w-0 truncate">
              <span className="font-mono tabular-nums text-body">
                {q.barcode}
              </span>
              {q.count > 1 && (
                <span className="ml-2 font-mono text-charcoal">×{q.count}</span>
              )}
              {q.note && (
                <span className="ml-2 text-charcoal">— {q.note}</span>
              )}
            </span>
            {q.reason === "variable-weight" ? (
              <button
                type="button"
                onClick={() => onManual(q.barcode, q.incoming)}
                className="h-9 shrink-0 rounded-md bg-surface-elevated px-4 text-xs font-medium text-ink"
              >
                Quick-add
              </button>
            ) : q.state === "manual" ? (
              <button
                type="button"
                onClick={() => onManual(q.barcode, q.incoming)}
                className="h-9 shrink-0 rounded-md bg-surface-elevated px-4 text-xs font-medium text-ink"
              >
                Add manually
              </button>
            ) : (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => onResolve(q.barcode, q.incoming)}
                  disabled={q.state === "resolving"}
                  className="h-9 rounded-md bg-surface-elevated px-4 text-xs font-medium text-ink transition-opacity disabled:opacity-50"
                >
                  {q.state === "resolving"
                    ? "Looking up…"
                    : q.state === "error"
                      ? "Retry"
                      : "Look up"}
                </button>
                <button
                  type="button"
                  onClick={() => onManual(q.barcode, q.incoming)}
                  className="h-9 rounded-md px-3 text-xs font-medium text-charcoal"
                >
                  Manual
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-charcoal">
        Product data from Open Food Facts. Misses route to manual entry.
      </p>
    </section>
  );
}
