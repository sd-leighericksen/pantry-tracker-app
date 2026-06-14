"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ *
 * USB barcode scanner (HID keyboard wedge) capture.
 *
 * Bound ONCE at the kiosk shell, on `window` in capture phase, so it sees
 * keys before any focused input and works regardless of focus. Distinguishes
 * scans from human typing by inter-key timing; commits on Enter (or after a
 * short silence for scanners with no Enter suffix). See the
 * barcode-scanner-wedge skill — do not add per-component scan listeners.
 * ------------------------------------------------------------------ */

type Opts = {
  onScan: (code: string) => void;
  enabled: boolean;
  /** Max ms between keystrokes still considered a scan (default 50). */
  maxGapMs?: number;
  /** Minimum buffer length to accept (default 6). */
  minLength?: number;
  /** Auto-commit after this much silence for Enter-less scanners (default 100). */
  silenceMs?: number;
  /** Ignore an identical code re-committed within this window (default 300). */
  dedupeMs?: number;
};

const EAN_RE = /^\d{8}$|^\d{12,13}$/;

export function useBarcodeScanner({
  onScan,
  enabled,
  maxGapMs = 50,
  minLength = 6,
  silenceMs = 100,
  dedupeMs = 300,
}: Opts) {
  const buf = useRef("");
  const last = useRef(0);
  const lastCommit = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Keep the callback fresh without re-binding the listener (re-binding mid-scan
   * drops keystrokes). */
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const clearSilence = () => {
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
        silenceTimer.current = null;
      }
    };

    const commit = () => {
      const code = buf.current;
      buf.current = "";
      clearSilence();
      if (code.length < minLength || !EAN_RE.test(code)) return;

      /* Duplicate-scan guard: ignore a trigger-happy double pull of the same
       * code, but allow deliberate repeats after the window (multi-quantity). */
      const now = performance.now();
      const prev = lastCommit.current;
      if (prev.code === code && now - prev.at < dedupeMs) return;
      lastCommit.current = { code, at: now };

      onScanRef.current(code);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return; // IME composition, not a scan

      const now = performance.now();
      if (now - last.current > maxGapMs) buf.current = ""; // human-speed gap: reset
      last.current = now;

      if (e.key === "Enter") {
        const valid = buf.current.length >= minLength && EAN_RE.test(buf.current);
        if (valid) {
          /* Only swallow Enter on a real scan commit, so it never leaks into
           * a focused form. Individual characters are allowed to leak. */
          e.preventDefault();
          e.stopPropagation();
          commit();
        } else {
          buf.current = "";
        }
        return;
      }

      if (e.key.length === 1) {
        buf.current += e.key;
        /* Fallback commit for scanners configured without an Enter suffix. */
        clearSilence();
        silenceTimer.current = setTimeout(commit, silenceMs);
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      clearSilence();
    };
  }, [enabled, maxGapMs, minLength, silenceMs, dedupeMs]);
}
