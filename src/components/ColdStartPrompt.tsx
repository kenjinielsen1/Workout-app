// Cold-start estimation capture (audit fix #5 · target.ts). Offered the first
// time a user opens an exercise with no logged history, instead of dropping them
// on the crude equipment default (an empty 45-lb bar for a 315-lb squatter). They
// enter a set they remember doing; we convert it to a loadable starting target.
// This is only a prescription — it is never written as a logged set.

import { useState } from 'react';

interface Props {
  exerciseName: string;
  onSubmit: (weightLb: number, reps: number) => void;
  onSkip: () => void;
}

export function ColdStartPrompt({ exerciseName, onSubmit, onSkip }: Props) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const w = Number(weight);
  const r = Number(reps);
  const valid = Number.isFinite(w) && w > 0 && Number.isFinite(r) && r > 0 && r <= 30;
  const field = 'rounded-xl bg-neutral-100 px-3 py-2 text-xl font-bold tabular-nums dark:bg-neutral-800';

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 sm:items-center" role="dialog" aria-label="Starting estimate" onClick={onSkip}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-t-2xl bg-white p-5 dark:bg-neutral-900 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">Starting point — {exerciseName}</h2>
          <p className="text-sm leading-snug text-neutral-500 dark:text-neutral-400">
            No history for this lift yet. Enter a set you remember doing recently and
            we’ll set a sensible first weight. It’s just an estimate — your first real
            set replaces it, and nothing here is logged as history.
          </p>
        </div>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-500 dark:text-neutral-400">Weight (lb)</span>
            <input type="number" inputMode="decimal" min={1} step={2.5} value={weight} aria-label="Recent weight"
              onChange={(e) => setWeight(e.target.value)} className={field} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-500 dark:text-neutral-400">for reps</span>
            <input type="number" inputMode="numeric" min={1} step={1} value={reps} aria-label="Recent reps"
              onChange={(e) => setReps(e.target.value)} className={field} />
          </label>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onSkip}
            className="flex-1 rounded-2xl bg-neutral-200 py-3 font-semibold text-neutral-700 active:scale-[0.99] dark:bg-neutral-700 dark:text-neutral-100">
            Use default
          </button>
          <button type="button" disabled={!valid} onClick={() => onSubmit(w, r)}
            className="flex-1 rounded-2xl bg-neutral-100 py-3 font-bold text-neutral-900 active:scale-[0.99] disabled:opacity-60">
            Set start
          </button>
        </div>
      </div>
    </div>
  );
}
