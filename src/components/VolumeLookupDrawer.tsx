// The drawer a user opens by tapping a muscle (or exercise) name in the weekly
// summary (VOLUME_SUGGESTIONS.md). It answers a direct question with lists and
// facts — never instructions. Plain, subordinate to the summary; no copper (not a
// PR moment). It announces nothing on its own; it only exists once opened.

import { addOptions, type CatalogExercise } from '../lib/volumeSuggestions';
import type { Equipment, MovementPattern } from '../lib/types';

/** Everything the lookup needs that isn't in the persisted summary — the live
 *  catalog and the CURRENT safety state (fatigue/deload/freeze are about now). */
export interface VolumeLookupContext {
  catalog: CatalogExercise[];
  accessibleEquipment: Equipment[];
  frozenPatterns: MovementPattern[];
  fatigueFlagged: boolean;
  plannedDeload: boolean;
}

const prettyMuscle = (m: string) => m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const round1 = (n: number) => Number(n.toFixed(1));

interface Props {
  muscle: string;
  /** This week's contributors to the muscle (from the summary snapshot). */
  contributors: { id: string; name: string; sets: number }[];
  ctx: VolumeLookupContext;
  onClose: () => void;
}

export function VolumeLookupDrawer({ muscle, contributors, ctx, onClose }: Props) {
  const add = addOptions({
    muscle,
    catalog: ctx.catalog,
    doneThisWeek: new Set(contributors.map((c) => c.id)),
    accessibleEquipment: new Set(ctx.accessibleEquipment),
    frozenPatterns: new Set(ctx.frozenPatterns),
    fatigueFlagged: ctx.fatigueFlagged,
    plannedDeload: ctx.plannedDeload,
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/50 sm:items-center" role="dialog" aria-label={`${prettyMuscle(muscle)} lookup`} onClick={onClose}>
      <div
        className="mx-auto flex max-h-[80vh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-2xl bg-neutral-900 p-5 dark:bg-neutral-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-100">{prettyMuscle(muscle)}</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-neutral-400">Close</button>
        </div>

        {/* Reduce side — always available, pure fact. Nominates nothing. */}
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Contributing this week</h3>
          {contributors.length === 0 ? (
            <p className="text-sm text-neutral-400">No hard sets this week.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {contributors.map((c) => (
                <li key={c.id} className="flex items-baseline justify-between gap-3 text-sm text-neutral-300">
                  <span>{c.name}</span>
                  <span className="tabular-nums text-neutral-400">{round1(c.sets)} sets</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Add side — a catalog lookup, withheld under safety. Options, not orders. */}
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Also trains {prettyMuscle(muscle)}</h3>
          {add.kind === 'withheld' ? (
            <p className="text-sm text-neutral-400">{add.reason}</p>
          ) : add.options.length === 0 ? (
            <p className="text-sm text-neutral-400">Nothing else in your catalog trains this as a primary with your current equipment.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {add.options.map((o) => (
                <li key={o.id} className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-neutral-200">{o.name}</span>
                  <span className="text-xs text-neutral-500">
                    Primary: {o.primary.map(prettyMuscle).join(', ')}
                    {o.secondary.length > 0 && <> · Secondary: {o.secondary.map(prettyMuscle).join(', ')}</>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
