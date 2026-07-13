import { useMemo } from 'react';
import {
  e1rmSeries,
  prHistory,
  recentSessions,
  repMaxes,
  summarize,
  tonnageSeries,
  type StatSession,
} from '../lib/exerciseStats';
import type { LoadType } from '../lib/types';
import { LineChart, type LinePoint } from '../components/LineChart';
import { BarChart } from '../components/BarChart';
import { SessionHistory } from '../components/SessionHistory';

export interface DetailExercise {
  name: string;
  load_type: LoadType;
}

export interface DetailProfile {
  bodyweight_lb: number;
}

interface ExerciseDetailProps {
  exercise: DetailExercise;
  profile: DetailProfile;
  sessions: StatSession[];
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const fmtTonnage = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`);

function StatTile({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl bg-neutral-100 px-3 py-3 dark:bg-neutral-800">
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-50">{value}</span>
      {sub && <span className="text-xs">{sub}</span>}
    </div>
  );
}

export function ExerciseDetail({ exercise, profile, sessions }: ExerciseDetailProps) {
  const { summary, e1rmPoints, tonnagePoints, prs, rms, recent } = useMemo(() => {
    const summary = summarize(sessions, exercise, profile);
    const series = e1rmSeries(sessions, exercise, profile);
    const prList = prHistory(sessions, exercise, profile);
    const prDates = new Set(prList.map((p) => p.date));
    const e1rmPoints: LinePoint[] = series.map((p) => ({ t: p.t, y: p.e1rm, pr: prDates.has(p.date) }));
    return {
      summary,
      e1rmPoints,
      tonnagePoints: tonnageSeries(sessions, exercise, profile).map((p) => ({ t: p.t, y: p.tonnage })),
      prs: [...prList].reverse(), // most recent PR first
      rms: repMaxes(sessions, exercise, profile),
      recent: recentSessions(sessions, exercise, profile, 5),
    };
  }, [sessions, exercise, profile]);

  const change = summary.e1rmChange;
  const changeText =
    change === null ? '—' : `${change >= 0 ? '+' : ''}${(change * 100).toFixed(1)}%`;
  const changeColor =
    change === null
      ? 'text-neutral-400'
      : change >= 0
        ? 'text-[var(--viz-good)]'
        : 'text-amber-600 dark:text-amber-400';

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-5 px-4 py-6 text-neutral-900 dark:text-neutral-50">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{exercise.name}</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {summary.sessionCount} sessions
          {summary.lastPerformed ? ` · last ${fmtDate(summary.lastPerformed)}` : ''}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2">
        <StatTile
          label="Est. 1RM"
          value={summary.currentE1RM ? `${Math.round(summary.currentE1RM)} lb` : '—'}
          sub={<span className={changeColor}>{changeText} since start</span>}
        />
        <StatTile label="Best e1RM" value={summary.bestE1RM ? `${Math.round(summary.bestE1RM)} lb` : '—'} />
        <StatTile label="Total tonnage" value={`${fmtTonnage(summary.totalTonnage)} lb`} />
        <StatTile label="PRs" value={`${prs.length}`} />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Estimated 1RM</h2>
          {prs.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--viz-good)]" aria-hidden />
              personal record
            </span>
          )}
        </div>
        <LineChart points={e1rmPoints} ariaLabel="Estimated 1RM over time" formatY={(n) => `${Math.round(n)}`} />
      </section>

      {recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Last 5 sessions</h2>
          <SessionHistory sessions={recent} />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Tonnage per session</h2>
        <BarChart bars={tonnagePoints} ariaLabel="Tonnage per session" formatY={fmtTonnage} />
      </section>

      {rms.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Rep maxes</h2>
          <div className="flex flex-wrap gap-1.5">
            {rms.map((r) => (
              <span key={r.reps} className="rounded-lg bg-neutral-100 px-2.5 py-1 text-sm tabular-nums dark:bg-neutral-800">
                <span className="font-bold">{r.weight_lb}</span>
                <span className="text-neutral-500 dark:text-neutral-400"> × {r.reps}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {prs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">PR history</h2>
          <ul aria-label="PR history" className="flex flex-col gap-1.5">
            {prs.map((p) => (
              <li
                key={p.date}
                className="flex items-center justify-between rounded-xl bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--viz-good)]" aria-hidden />
                  <span className="font-semibold tabular-nums">{Math.round(p.e1rm)} lb e1RM</span>
                </span>
                <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                  {p.weight_lb} × {p.reps} · {fmtDate(p.date)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
