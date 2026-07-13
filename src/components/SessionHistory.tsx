// Readable per-exercise history (FEATURES.md #6): the last few sessions as a
// scannable list — the raw inputs behind today's recommendation. Presentational;
// data comes from recentSessions() over the local store, so it works offline.

import type { HistorySession } from '../lib/exerciseStats';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** "225 × 5, 5, 5" — group consecutive same-weight sets; "·"-join weight groups. */
function formatSets(sets: HistorySession['sets']): string {
  const groups: { weight: number; reps: string[] }[] = [];
  for (const s of sets) {
    const rep = s.failed ? `${s.reps}✗` : `${s.reps}`;
    const last = groups[groups.length - 1];
    if (last && last.weight === s.weight_lb) last.reps.push(rep);
    else groups.push({ weight: s.weight_lb, reps: [rep] });
  }
  return groups.map((g) => `${g.weight} × ${g.reps.join(', ')}`).join(' · ');
}

interface Props {
  title?: string;
  sessions: HistorySession[];
}

export function SessionHistory({ title, sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        No history yet — your logged sessions will show here.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {title && (
        <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{title}</h3>
      )}
      <ul className="flex flex-col gap-1.5">
        {sessions.map((s) => (
          <li
            key={s.date}
            className="flex items-center justify-between gap-3 rounded-xl bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800"
          >
            <span className="w-12 shrink-0 text-neutral-500 dark:text-neutral-400">{fmtDate(s.date)}</span>
            <span className="flex-1 font-medium tabular-nums">{formatSets(s.sets)}</span>
            <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
              {s.rir != null ? `RIR ${s.rir}` : ''}
            </span>
            <span className="w-20 shrink-0 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
              {s.e1rm != null ? `→ ${s.e1rm}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
