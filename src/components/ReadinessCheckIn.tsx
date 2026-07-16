// Session-start readiness check-in (FEATURES.md #2). Three fast 1–5 taps that
// feed the progression engine's S6 signal. Fully skippable — skipping leaves the
// engine at its neutral default. Not a survey: picking the third value submits.

import { useState } from 'react';

export interface CheckinAnswers {
  sleep_quality: number;
  soreness: number;
  energy: number;
}

interface Props {
  onSubmit: (c: CheckinAnswers) => void;
  onSkip: () => void;
}

const ROWS = [
  { key: 'sleep_quality', label: 'Sleep', hint: '1 poor · 5 great' },
  { key: 'soreness', label: 'Soreness', hint: '1 fresh · 5 very sore' },
  { key: 'energy', label: 'Energy', hint: '1 flat · 5 buzzing' },
] as const;

export function ReadinessCheckIn({ onSubmit, onSkip }: Props) {
  const [vals, setVals] = useState<Partial<CheckinAnswers>>({});

  const pick = (key: keyof CheckinAnswers, n: number) => {
    const next = { ...vals, [key]: n };
    setVals(next);
    if (next.sleep_quality != null && next.soreness != null && next.energy != null) {
      onSubmit(next as CheckinAnswers);
    }
  };

  return (
    <section
      aria-label="Readiness check-in"
      className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          How are you feeling today?
        </h2>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Skip
        </button>
      </div>
      {ROWS.map((row) => (
        <div key={row.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">{row.label}</span>
            <span className="text-[11px] text-neutral-400">{row.hint}</span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = vals[row.key] === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={`${row.label} ${n}`}
                  aria-pressed={active}
                  onClick={() => pick(row.key, n)}
                  className={`h-10 flex-1 rounded-xl text-sm font-semibold tabular-nums transition active:scale-95 ${
                    active
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-[11px] leading-snug text-neutral-400">
        Feeds today's targets — a rough day softens the load, never forces it.
      </p>
    </section>
  );
}
