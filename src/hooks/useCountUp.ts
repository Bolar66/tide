import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './useReducedMotion';

/** Animates a number from 0 (first render) or its previous value to `target`. */
export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const shown = useRef(value);
  useEffect(() => {
    const from = shown.current;
    if (from === target) return;
    if (prefersReducedMotion()) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const next = Math.round(from + (target - from) * (1 - (1 - p) ** 3));
      shown.current = next;
      setValue(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return prefersReducedMotion() ? target : value;
}
