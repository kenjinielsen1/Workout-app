// Alternating exercise pairing (PAIRING.md). A UI-only affordance: two exercises
// on one screen, alternated with normal rest between every set. This bar shows the
// pair — each with its own target and this-session set count — and lets the user
// switch which one is active (loggable) or unpair. It holds NO state and persists
// NOTHING; the pairing lives only in Home's view-state for the session.

import { formatWeightUnit, type WeightUnit } from '../lib/units';

export interface PairCell {
  id: string;
  name: string;
  /** The exercise's own prescription; null while it's still being computed. */
  target: { target_weight_lb: number; target_reps: number } | null;
  /** Working sets logged for this exercise so far this session. */
  setCount: number;
}

interface PairBarProps {
  cells: [PairCell, PairCell];
  activeId: string;
  unit?: WeightUnit;
  onSwitch: (id: string) => void;
  onUnpair: () => void;
}

export function PairBar({ cells, activeId, unit = 'lb', onSwitch, onUnpair }: PairBarProps) {
  return (
    <div className="mx-auto flex w-full max-w-md items-stretch gap-2 px-4">
      <div className="flex flex-1 gap-2">
        {cells.map((c) => {
          const active = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              aria-current={active}
              onClick={() => !active && onSwitch(c.id)}
              className={`flex flex-1 flex-col gap-0.5 rounded-2xl border px-3 py-2 text-left transition active:scale-[0.99] ${
                active
                  ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-950/30'
                  : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
              }`}
            >
              <span className="truncate text-sm font-semibold">{c.name}</span>
              <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {c.target ? `${formatWeightUnit(c.target.target_weight_lb, unit)} × ${c.target.target_reps}` : '—'}
              </span>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                {c.setCount} {c.setCount === 1 ? 'set' : 'sets'}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Unpair"
        onClick={onUnpair}
        className="shrink-0 rounded-2xl border border-dashed border-neutral-300 px-3 text-lg text-neutral-400 active:scale-[0.99] dark:border-neutral-700"
      >
        ✕
      </button>
    </div>
  );
}
