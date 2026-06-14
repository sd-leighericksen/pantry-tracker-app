"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import { NutriBadge } from "@/components/NutriBadge";

/* The per-scan feedback card (DESIGN.md scan-toast-card). GSAP is feedback,
 * not decoration: enter is fast, the success/error glow rings once, and a new
 * scan immediately retriggers — the timeline never blocks the next scan. */

export type ToastKind =
  | "in"
  | "out"
  | "waste"
  | "unknown"
  | "variable-weight"
  | "zero-stock"
  | "invalid";

export type ToastPayload = {
  /** Increments on every scan so identical results still replay the animation. */
  nonce: number;
  kind: ToastKind;
  title: string;
  subtitle?: string | null;
  photo?: string | null;
  quantity?: number | null;
  nutriscore?: string | null;
};

export function ScanToast({ payload }: { payload: ToastPayload | null }) {
  const root = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!payload) return;

      gsap.matchMedia().add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const { motion } = ctx.conditions as { motion: boolean };

          if (!motion) {
            gsap.set(root.current, { opacity: 1, y: 0, scale: 1 });
            gsap.set(glow.current, { opacity: 0 });
            return;
          }

          gsap.fromTo(
            root.current,
            { opacity: 0, y: 16, scale: 0.96 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.2,
              ease: "power3.out",
            },
          );
          gsap.fromTo(
            glow.current,
            { opacity: 0.6, scale: 1 },
            { opacity: 0, scale: 1.6, duration: 0.36, ease: "none" },
          );
        },
      );
    },
    { dependencies: [payload?.nonce], scope: root },
  );

  if (!payload) return null;

  const glowColour =
    payload.kind === "in"
      ? "bg-accent-glow"
      : payload.kind === "out"
        ? "bg-transparent" // used = neutral, no alarm glow
        : "bg-danger-glow"; // waste + error states

  return (
    <div className="relative">
      <div
        ref={glow}
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-xl ${glowColour}`}
      />
      <div
        ref={root}
        role="status"
        aria-live="polite"
        className="relative flex items-center gap-5 rounded-xl border border-hairline-strong bg-surface-elevated p-6"
      >
        <Thumb payload={payload} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-medium text-ink">
            {payload.title}
          </p>
          {payload.subtitle && (
            <p className="mt-1 truncate text-sm text-charcoal">
              {payload.subtitle}
            </p>
          )}
          {payload.nutriscore && (
            <div className="mt-3">
              <NutriBadge score={payload.nutriscore} />
            </div>
          )}
        </div>
        {typeof payload.quantity === "number" && (
          <div className="text-right">
            <span className="font-mono text-[64px] font-medium leading-none tabular-nums text-ink">
              {payload.quantity}
            </span>
            <p className="mt-1 text-xs uppercase tracking-widest text-charcoal">
              in stock
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Thumb({ payload }: { payload: ToastPayload }) {
  if (payload.photo) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- local cached
         product images are served from the /data volume; the OFF image
         pipeline (next phase) will move these to next/image. */
      <img
        src={payload.photo}
        alt=""
        className="size-40 shrink-0 rounded-md object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex size-40 shrink-0 items-center justify-center rounded-md bg-surface-card"
    >
      <span className="text-5xl font-semibold text-charcoal">
        {payload.title.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
