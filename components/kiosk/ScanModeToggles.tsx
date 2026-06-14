"use client";

import { ArrowDown, ArrowUp, Trash } from "@phosphor-icons/react";

import type { ScanMode } from "@/lib/scan";

/* The persistent, mutually-exclusive armable buttons (DESIGN.md
 * scan-mode-toggle). 96px tall — the kiosk arm tap target. Tapping an armed
 * mode disarms it; tapping another switches. Three modes: stock In, Used,
 * and Wasted (Wasted is tracked separately for waste reporting). */

type Props = {
  mode: ScanMode | "idle";
  onArm: (mode: ScanMode) => void;
};

export function ScanModeToggles({ mode, onArm }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <ModeButton
        label="Scan In"
        armed={mode === "in"}
        armedClass="bg-accent text-accent-on shadow-[0_0_60px_-12px] shadow-accent-glow"
        icon={<ArrowDown weight="bold" size={26} />}
        onClick={() => onArm("in")}
      />
      <ModeButton
        label="Used"
        armed={mode === "out"}
        armedClass="bg-mute text-on-light shadow-[0_0_60px_-12px] shadow-black/40"
        icon={<ArrowUp weight="bold" size={26} />}
        onClick={() => onArm("out")}
      />
      <ModeButton
        label="Wasted"
        armed={mode === "waste"}
        armedClass="bg-danger text-ink shadow-[0_0_60px_-12px] shadow-danger-glow"
        icon={<Trash weight="bold" size={26} />}
        onClick={() => onArm("waste")}
      />
    </div>
  );
}

function ModeButton({
  label,
  armed,
  armedClass,
  icon,
  onClick,
}: {
  label: string;
  armed: boolean;
  armedClass: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={armed}
      className={[
        "flex h-24 flex-col items-center justify-center gap-1.5 rounded-xl border text-lg font-semibold transition-colors duration-200",
        armed
          ? `border-transparent ${armedClass}`
          : "border-hairline-strong bg-surface-card text-ink",
      ].join(" ")}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
