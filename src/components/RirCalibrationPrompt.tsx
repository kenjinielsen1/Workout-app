// RIR failure-test capture (audit fix #1 · PROGRESSION.md Part 6). Offered only on
// non-barbell isolation work (SCOPE_SAFETY.md). The user predicts their reps,
// takes the set to true failure, and reports what they actually got — the gap
// teaches the engine each user's personal reps-in-reserve bias.

import { useState } from 'react';

interface Props {
  exerciseName: string;
  onSubmit: (predictedReps: number, actualReps: number) => void;
  onSkip: () => void;
}

export function RirCalibrationPrompt({ exerciseName, onSubmit, onSkip }: Props) {
  const [predicted, setPredicted] = useState('');
  const [actual, setActual] = useState('');
  const p = Number(predicted);
  const a = Number(actual);
  const valid = Number.isFinite(p) && p > 0 && Number.isFinite(a) && a > 0;
  const field = 'rounded-xl bg-neutral-100 px-3 py-2 text-xl font-bold tabular-nums dark:bg-neutral-800';

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 sm:items-center" role="dialog" aria-label="RIR calibration" onClick={onSkip}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-t-2xl bg-white p-5 dark:bg-neutral-900 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">Calibrate your RIR — {exerciseName}</h2>
          <p className="text-sm leading-snug text-neutral-500 dark:text-neutral-400">
            Pick a weight, predict how many reps you’ll get, then take the set to true
            failure and enter what you actually got. This teaches the app how close to
            failure you really are — an isolation lift only, never a heavy compound.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-500 dark:text-neutral-400">Reps you predict</span>
          <input type="number" inputMode="numeric" min={1} step={1} value={predicted} aria-label="Predicted reps"
            onChange={(e) => setPredicted(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-500 dark:text-neutral-400">Reps you actually got (to failure)</span>
          <input type="number" inputMode="numeric" min={1} step={1} value={actual} aria-label="Actual reps"
            onChange={(e) => setActual(e.target.value)} className={field} />
        </label>

        <div className="flex gap-2">
          <button type="button" onClick={onSkip}
            className="flex-1 rounded-2xl bg-neutral-200 py-3 font-semibold text-neutral-700 active:scale-[0.99] dark:bg-neutral-700 dark:text-neutral-100">
            Not now
          </button>
          <button type="button" disabled={!valid} onClick={() => onSubmit(p, a)}
            className="flex-1 rounded-2xl bg-neutral-100 py-3 font-bold text-neutral-900 active:scale-[0.99] disabled:opacity-60">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
