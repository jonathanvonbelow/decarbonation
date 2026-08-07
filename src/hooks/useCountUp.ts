/**
 * useCountUp / usePrevious — the "changes are visible" primitive (19_estetica_visual.md §3).
 * "Toda cifra que cambia entre años se anima. Sin esto, la simulación es invisible."
 */
import { useEffect, useRef, useState } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

/**
 * Animates from `from` to `to` over `durationMs` with an ease-out cubic curve, via rAF (never
 * `setInterval`, so it stays in sync with the browser's paint cycle). Duration is fixed, not
 * proportional to the delta, so several tiles animating at once stay visually in sync (§3).
 * Respects `prefers-reduced-motion`: jumps straight to `to`, no count, per the source spec.
 */
/** `delayMs` implements the "escalonamiento" from §3: tiles animate 60ms apart, left to right,
 * instead of all firing at once — one line of stagger turns twelve simultaneous animations into a
 * sequential read. */
export function useCountUp(from: number, to: number, durationMs = 900, delayMs = 0): number {
  const [display, setDisplay] = useState(to);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (reducedRef.current || from === to) { setDisplay(to); return; }
    let raf: number;
    let timeout: number;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const run = () => {
      let start: number | null = null;
      const step = (ts: number) => {
        if (start === null) start = ts;
        const t = Math.min(1, (ts - start) / durationMs);
        setDisplay(from + (to - from) * easeOutCubic(t));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    timeout = window.setTimeout(run, delayMs);
    return () => { window.clearTimeout(timeout); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, durationMs, delayMs]);

  return display;
}
