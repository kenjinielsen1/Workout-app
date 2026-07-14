// Plateau breaker decision card (FEATURES.md #5). Shown on the Today screen when
// the engine detects a GENUINE stall (flat e1RM, normal fatigue). A stall is
// exactly when a lifter wants agency, so this offers a choice instead of silently
// deloading. The exercise-variation option only appears when a real variant
// exists in the catalog.

import type { PlateauChoice } from '../data/domain';
import type { VariantExercise } from '../lib/variants';

interface Props {
  currentRange: { min: number; max: number };
  shiftedRange: { min: number; max: number };
  variants: VariantExercise[];
  /** Hypertrophy stall at adequate load with volume below the sweet spot
   *  (VOLUME.md): suggest adding a set before deloading. */
  underVolume?: boolean;
  onChoose: (choice: PlateauChoice, variantId?: string) => void;
  onDismiss: () => void;
}

export function PlateauCard({ currentRange, shiftedRange, variants, underVolume = false, onChoose, onDismiss }: Props) {
  return (
    <section
      aria-label="Plateau breaker"
      className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 dark:border-amber-700/50 dark:bg-amber-950/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">Plateau detected</h2>
          <p className="text-xs leading-snug text-amber-800/80 dark:text-amber-200/70">
            Your estimated 1RM has been flat with fresh legs — a real stall, not fatigue.
            Pick how to break it:
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss plateau breaker"
          className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-300"
        >
          Later
        </button>
      </div>

      {underVolume && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs leading-snug text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <span className="font-semibold">Try more volume first.</span> Your weekly hard sets for
          this muscle are below the sweet spot — adding a set is often the fix for a
          hypertrophy stall, before backing off load.
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onChoose('deload')}
          className="flex flex-col items-start rounded-xl bg-white px-3 py-2 text-left active:scale-[0.99] dark:bg-neutral-900"
        >
          <span className="text-sm font-semibold">Deload</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Back off ~10% and rebuild through the range.
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChoose('rep_range_shift')}
          className="flex flex-col items-start rounded-xl bg-white px-3 py-2 text-left active:scale-[0.99] dark:bg-neutral-900"
        >
          <span className="text-sm font-semibold">
            Shift rep range → {shiftedRange.min}–{shiftedRange.max}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Leave {currentRange.min}–{currentRange.max} for a block to drive a new adaptation.
          </span>
        </button>

        {variants.length > 0 && (
          <div className="flex flex-col gap-1 rounded-xl bg-white px-3 py-2 dark:bg-neutral-900">
            <span className="text-sm font-semibold">Swap to a variation</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              A close variant with its own curve breaks the rut.
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onChoose('variation', v.id)}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white active:scale-95"
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
