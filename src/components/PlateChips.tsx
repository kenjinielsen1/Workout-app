import { groupPlates, type PlateResult } from '../lib/plateMath';

interface PlateChipsProps {
  result: PlateResult | null; // null = not a plate-loaded lift
  effectiveNote: string; // e.g. "120 lb on the body" for dumbbells
}

/** Plate-math chips for barbell / plate machines; otherwise the effective-load note. */
export function PlateChips({ result, effectiveNote }: PlateChipsProps) {
  if (!result) {
    return (
      <div className="rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        {effectiveNote}
      </div>
    );
  }

  const groups = groupPlates(result.perSide);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {result.barWeightLb > 0 && (
          <span className="rounded-lg bg-neutral-800 px-2.5 py-1 text-sm font-semibold text-white dark:bg-neutral-200 dark:text-neutral-900">
            bar {result.barWeightLb}
          </span>
        )}
        {groups.length === 0 && result.barWeightLb > 0 && (
          <span className="text-sm text-neutral-400">empty bar</span>
        )}
        {groups.map((g, i) => (
          <span
            key={`${g.plate}-${i}`}
            className="rounded-lg bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100"
          >
            {g.count > 1 ? `${g.count}×${g.plate}` : g.plate}
          </span>
        ))}
        <span className="text-xs text-neutral-400">per side</span>
      </div>
      {!result.loadable && (
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
          Not exactly loadable — {result.remainderLb} lb short. Nearest loadable is{' '}
          {result.achievedWeightLb} lb.
        </p>
      )}
    </div>
  );
}
