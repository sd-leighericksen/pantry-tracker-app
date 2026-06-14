"use client";

/* ------------------------------------------------------------------ *
 * Scan audio feedback. Browsers block audio until a user gesture, so the
 * AudioContext is created/resumed lazily on `unlock()` — called from the
 * scan-mode arming tap (the natural gesture). Tones are synthesised, so
 * there are no audio assets to ship. Toggleable per BRIEF §6.
 * ------------------------------------------------------------------ */

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export type ScanTone = "success" | "out" | "error";

const TONES: Record<ScanTone, { freq: number; type: OscillatorType; ms: number }> = {
  success: { freq: 880, type: "sine", ms: 120 },
  out: { freq: 440, type: "sine", ms: 120 },
  error: { freq: 180, type: "square", ms: 200 },
};

class ScanAudio {
  private ctx: AudioContext | null = null;

  /** Create or resume the AudioContext. Call from a user gesture. */
  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  play(tone: ScanTone): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;

    const { freq, type, ms } = TONES[tone];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;

    const now = ctx.currentTime;
    const dur = ms / 1000;
    /* Short attack + exponential release so tones don't click. */
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }
}

/* Single shared instance — one AudioContext for the whole kiosk session. */
export const scanAudio = new ScanAudio();
