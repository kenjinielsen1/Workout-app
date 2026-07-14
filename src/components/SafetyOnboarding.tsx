// One-time onboarding disclaimer (SCOPE_SAFETY.md). Educational tool, not medical
// advice. Also captures any special-population indication so the app can frame its
// output as general information and route to a professional — it never tailors
// programming for these. Shown once, then recorded.

import { useState } from 'react';
import { ONBOARDING_DISCLAIMER, SPECIAL_POPULATION_LABELS, type SpecialPopulation } from '../lib/safety';

interface Props {
  onAcknowledge: (specialPopulations: SpecialPopulation[]) => void;
}

const POPS = Object.keys(SPECIAL_POPULATION_LABELS) as SpecialPopulation[];

export function SafetyOnboarding({ onAcknowledge }: Props) {
  const [selected, setSelected] = useState<Set<SpecialPopulation>>(new Set());

  const toggle = (p: SpecialPopulation) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center" role="dialog" aria-label="Welcome">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-t-2xl bg-white p-5 dark:bg-neutral-900 sm:rounded-2xl">
        <h2 className="text-lg font-bold">Before you start</h2>
        <p className="text-sm leading-snug text-neutral-600 dark:text-neutral-300">{ONBOARDING_DISCLAIMER}</p>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Do any of these apply? (optional)</span>
          {POPS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(p)}
                aria-label={SPECIAL_POPULATION_LABELS[p]}
                onChange={() => toggle(p)}
                className="h-5 w-5 rounded accent-emerald-600"
              />
              <span className="capitalize">{SPECIAL_POPULATION_LABELS[p]}</span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onAcknowledge([...selected])}
          className="w-full rounded-2xl bg-emerald-600 py-3 text-base font-bold text-white active:scale-[0.99]"
        >
          I understand
        </button>
      </div>
    </div>
  );
}
