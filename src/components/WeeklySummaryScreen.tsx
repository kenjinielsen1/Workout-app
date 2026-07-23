// Full-screen weekly readout: the Sunday interstitial AND the re-openable history
// browser (WEEKLY_SUMMARY.md). Newest-first; page back through past weeks, since
// week-over-week is itself signal. Skippable — the user enters or dismisses.

import type { WeeklySummary } from '../lib/weeklySummary';
import { WeeklySummaryView } from './WeeklySummaryView';
import type { VolumeLookupContext } from './VolumeLookupDrawer';

interface Props {
  summaries: WeeklySummary[]; // newest first
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** Context for the on-request volume lookup (VOLUME_SUGGESTIONS.md). */
  lookup?: VolumeLookupContext;
}

export function WeeklySummaryScreen({ summaries, index, onIndex, onClose, lookup }: Props) {
  const summary = summaries[index];
  if (!summary) return null;
  const older = index < summaries.length - 1; // further back exists
  const newer = index > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--iron)]">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-neutral-800 bg-neutral-950/90 px-4 py-2.5 backdrop-blur">
        <span className="text-sm font-semibold text-neutral-200">Your week</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-neutral-400 active:scale-[0.98]"
        >
          Done
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <WeeklySummaryView summary={summary} lookup={lookup} />

        {(older || newer) && (
          <nav className="mx-auto flex max-w-md items-center justify-between gap-2 px-4 pb-8">
            <button
              type="button"
              disabled={!older}
              onClick={() => onIndex(index + 1)}
              className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-300 disabled:opacity-40"
            >
              ← Earlier week
            </button>
            <button
              type="button"
              disabled={!newer}
              onClick={() => onIndex(index - 1)}
              className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-300 disabled:opacity-40"
            >
              Later week →
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
