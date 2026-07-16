// The one loud moment (DESIGN.md "signature moment"). Copper arrives all at once,
// the new e1RM counts up, the block shakes briefly, and the delta against the
// previous best is named. Everything else in the app stays quiet so this lands.
// Copper is used HERE and nowhere else.
//
// prefers-reduced-motion: skip the shake and the count-up; keep the copper and the
// number (a static, fully-formed readout).

import { useEffect, useState } from 'react';
import { formatE1RM, type WeightUnit } from '../lib/units';

interface Props {
  /** The new personal-best estimated 1RM, in lb. */
  e1rm: number;
  /** The previous best, in lb (0 when this lift had no tracked best yet). */
  prev: number;
  unit: WeightUnit;
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!m) return;
    setReduce(m.matches);
    const on = () => setReduce(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return reduce;
}

/** Ease a value from `from` to `to` over ~600ms. Inert (shows `to`) when animation
 *  is off, so the number is always correct and present for screen readers. */
function useCountUp(to: number, from: number, animate: boolean): number {
  const [v, setV] = useState(animate ? from : to);
  useEffect(() => {
    if (!animate) {
      setV(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, from, animate]);
  return v;
}

export function PrCelebration({ e1rm, prev, unit }: Props) {
  const reduce = usePrefersReducedMotion();
  const shown = useCountUp(e1rm, prev > 0 ? prev : 0, !reduce);
  const delta = prev > 0 ? e1rm - prev : null;

  return (
    <div
      role="status"
      className={`flex flex-col gap-0.5 rounded-2xl border bg-[var(--iron-raised)] px-4 py-3 border-copper ${reduce ? '' : 'pr-shake'}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-copper">New best</span>
      <span className="flex items-baseline gap-2 text-copper">
        <span className="text-4xl font-bold tabular-nums">{formatE1RM(shown, unit)}</span>
        <span className="text-sm font-medium">{unit} e1RM</span>
      </span>
      {delta !== null && (
        <span className="text-xs font-medium tabular-nums text-[var(--chalk-dim)]">
          +{formatE1RM(delta, unit)} {unit} on your previous best
        </span>
      )}
    </div>
  );
}
