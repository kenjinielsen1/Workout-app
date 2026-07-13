import type { LoggedSet } from '../data/domain';
import { formatWeight, type WeightUnit } from '../lib/units';

export interface WorkoutLogEntry {
  exercise_id: string;
  name: string;
  sets: LoggedSet[];
}

/** A running log of every movement + set done so far in the current session. */
export function WorkoutLog({
  entries,
  currentExerciseId,
  unit = 'lb',
}: {
  entries: WorkoutLogEntry[];
  currentExerciseId: string;
  unit?: WeightUnit;
}) {
  if (entries.length === 0) return null;
  const workingSets = entries.reduce((n, e) => n + e.sets.filter((s) => !s.is_warmup).length, 0);

  return (
    <section aria-label="This workout" className="mx-auto w-full max-w-md px-4">
      <div className="rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-bold">This workout</h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {entries.length} movement{entries.length > 1 ? 's' : ''} · {workingSets} sets
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {entries.map((e) => (
            <div key={e.exercise_id}>
              <div
                className={`text-sm font-semibold ${
                  e.exercise_id === currentExerciseId ? 'text-emerald-600' : 'text-neutral-700 dark:text-neutral-200'
                }`}
              >
                {e.name}
              </div>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {e.sets.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg bg-neutral-100 px-2 py-1 text-xs tabular-nums text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {s.is_warmup && <span className="text-neutral-400">wu </span>}
                    {formatWeight(s.weight_lb, unit)}×{s.reps}
                    {s.failed && <span className="text-amber-500"> ✕</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
