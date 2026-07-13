// One-time per-machine calibration (INCREMENTS.md). The first time a user logs a
// cable/machine exercise, we quietly ask the smallest weight change on THAT
// machine at THEIR gym and store it as an override — after which every
// recommendation for it is loadable. Skippable; asked once per exercise.

import { useState } from 'react';

interface Props {
  exerciseName: string;
  /** Current guessed increment, to prefill. */
  defaultIncrement: number;
  onSave: (increment: number, min: number | null) => void;
  onSkip: () => void;
}

export function IncrementPrompt({ exerciseName, defaultIncrement, onSave, onSkip }: Props) {
  const [inc, setInc] = useState(String(defaultIncrement));
  const [min, setMin] = useState('');

  const incNum = Number(inc);
  const valid = Number.isFinite(incNum) && incNum > 0;
  const field = 'rounded-xl bg-neutral-100 px-3 py-2 text-base tabular-nums dark:bg-neutral-800';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center"
      role="dialog"
      aria-label="Machine increment"
      onClick={onSkip}
    >
      <div
        className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-t-2xl bg-white p-5 dark:bg-neutral-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">Calibrate {exerciseName}</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            What's the smallest weight change on this machine? We'll only ever
            prescribe weights you can actually select.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-500 dark:text-neutral-400">Smallest change (lb)</span>
          <input
            type="number"
            inputMode="decimal"
            value={inc}
            min={0}
            step={0.5}
            aria-label="Smallest weight change"
            onChange={(e) => setInc(e.target.value)}
            className={`${field} text-xl font-bold`}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-500 dark:text-neutral-400">Lightest weight (optional)</span>
          <input
            type="number"
            inputMode="decimal"
            value={min}
            min={0}
            step={0.5}
            placeholder="e.g. the first plate on the stack"
            aria-label="Lightest selectable weight"
            onChange={(e) => setMin(e.target.value)}
            className={field}
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 rounded-2xl bg-neutral-200 py-3 font-semibold text-neutral-700 active:scale-[0.99] dark:bg-neutral-700 dark:text-neutral-100"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => onSave(incNum, min.trim() === '' ? null : Number(min))}
            className="flex-1 rounded-2xl bg-emerald-600 py-3 font-bold text-white active:scale-[0.99] disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
