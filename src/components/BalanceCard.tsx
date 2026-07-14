// Movement-pattern balance observation (PROGRAMMING.md Part B). An observation,
// never a mandate — with a concrete catalog fix and a "this is intentional"
// dismissal that respects deliberate imbalance (a peaking lifter, a spec block).

import type { BalanceObservation } from '../lib/balance';

interface Props {
  observation: BalanceObservation;
  /** Jump to the suggested under-trained exercise. */
  onAddSuggestion?: (exerciseId: string) => void;
  /** Mark this imbalance intentional — suppress until it worsens materially. */
  onDismissIntentional: () => void;
}

export function BalanceCard({ observation, onAddSuggestion, onDismissIntentional }: Props) {
  return (
    <section
      aria-label="Balance check"
      className="mx-auto flex w-full max-w-md flex-col gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-base">⚖️</span>
        <p className="text-sm leading-snug text-neutral-700 dark:text-neutral-200">{observation.message}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {observation.suggestion && (
          <button
            type="button"
            onClick={() => onAddSuggestion?.(observation.suggestion!.id)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white active:scale-95"
          >
            Try {observation.suggestion.name}
          </button>
        )}
        <button
          type="button"
          onClick={onDismissIntentional}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          This is intentional
        </button>
      </div>
    </section>
  );
}
