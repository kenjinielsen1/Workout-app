// The one end-of-session prompt (SAVED_WORKOUTS.md). Fires ONLY on a structural
// difference — an exercise added, removed, or reordered — never on set counts,
// weights, reps, skipped sets, or a failed set. Once per session, at the end,
// trivially dismissible: skipping a lift because the rack was busy is the common
// case, so this is a convenience, not a checkpoint.
//
// "Keep as is" is the safe default; the template is unchanged unless the user
// explicitly updates it. The diff is shown plainly so the answer needs no recall.

import type { TemplateDiff } from '../lib/workoutTemplates';

interface Props {
  templateName: string;
  diff: TemplateDiff;
  /** Resolve ids to names for the diff lines. */
  nameOf: (id: string) => string;
  onUpdate: () => void;
  onKeep: () => void;
}

export function TemplateUpdatePrompt({ templateName, diff, nameOf, onUpdate, onKeep }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center" role="dialog" aria-label="Update template" onClick={onKeep}>
      <div
        className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-t-2xl bg-neutral-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-bold text-neutral-100">This session differed from {templateName}</h2>
          <ul className="flex flex-col gap-0.5 text-sm text-neutral-400">
            {diff.added.map((id) => <li key={`a-${id}`}>Added: {nameOf(id)}</li>)}
            {diff.removed.map((id) => <li key={`r-${id}`}>Skipped: {nameOf(id)}</li>)}
            {diff.reordered && <li>Order changed</li>}
          </ul>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onKeep}
            className="flex-1 rounded-2xl border border-neutral-600 py-3 font-semibold text-neutral-200 active:scale-[0.99]"
          >
            Keep as is
          </button>
          <button
            type="button"
            onClick={onUpdate}
            className="flex-1 rounded-2xl bg-neutral-100 py-3 font-bold text-neutral-900 active:scale-[0.99]"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
