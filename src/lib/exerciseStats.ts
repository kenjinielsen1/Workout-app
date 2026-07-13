// Exercise Detail statistics — pure transforms from logged sessions to the series
// the charts render. Every load calculation routes through effectiveLoad(), so
// dumbbell/per-side doubling and bodyweight adds are honored exactly once.
//
// The displayed e1RM is plain Epley on each set's EFFECTIVE load (weight × reps),
// not the RIR-adjusted figure the progression engine uses internally — this is the
// "estimated 1RM" a lifter recognizes, independent of how honest their RIR was.

import { e1RM, effectiveLoad } from './effectiveLoad';
import type { LoadType } from './types';

export interface StatSet {
  weight_lb: number;
  reps: number;
  rir?: number | null;
  is_warmup?: boolean;
  failed?: boolean;
}

export interface StatSession {
  performed_at: string; // ISO
  sets: StatSet[];
}

export interface StatExercise {
  load_type: LoadType;
}

export interface StatProfile {
  bodyweight_lb: number;
}

export interface E1RMPoint {
  date: string;
  t: number; // epoch ms, for the x-scale
  e1rm: number;
  weight_lb: number; // the set that produced the best e1RM
  reps: number;
}

export interface TonnagePoint {
  date: string;
  t: number;
  tonnage: number;
}

export interface Summary {
  sessionCount: number;
  currentE1RM: number | null;
  bestE1RM: number | null;
  firstE1RM: number | null;
  /** Fractional change from first to current e1RM (e.g. 0.12 = +12%). */
  e1rmChange: number | null;
  totalTonnage: number;
  lastPerformed: string | null;
}

const working = (s: StatSession): StatSet[] => s.sets.filter((x) => !x.is_warmup);

/** Best Epley e1RM across a session's working sets, with the set that made it. */
export function bestSetE1RM(
  session: StatSession,
  ex: StatExercise,
  user: StatProfile,
): { e1rm: number; weight_lb: number; reps: number } | null {
  let best: { e1rm: number; weight_lb: number; reps: number } | null = null;
  for (const set of working(session)) {
    if (set.reps <= 0) continue;
    const value = e1RM(effectiveLoad(set, ex, user), set.reps);
    if (!best || value > best.e1rm) best = { e1rm: value, weight_lb: set.weight_lb, reps: set.reps };
  }
  return best;
}

/** Epley e1RM for a single COUNTABLE set (working, not failed, reps > 0), else
 *  null. This is the displayed number — the engine uses the RIR-adjusted value
 *  internally (FEATURES.md #4). */
export function setE1RM(set: StatSet, ex: StatExercise, user: StatProfile): number | null {
  if (set.is_warmup || set.failed || set.reps <= 0) return null;
  return e1RM(effectiveLoad(set, ex, user), set.reps);
}

/** True when `set` sets a new e1RM PR versus `priorBest`. Warm-ups and failed
 *  sets never count (FEATURES.md #4). */
export function isE1RMPr(
  set: StatSet,
  priorBest: number,
  ex: StatExercise,
  user: StatProfile,
): boolean {
  const v = setE1RM(set, ex, user);
  return v !== null && v > priorBest + 1e-9;
}

/** Total effective tonnage (Σ load × reps) across a session's working sets. */
export function sessionTonnage(session: StatSession, ex: StatExercise, user: StatProfile): number {
  return working(session).reduce((sum, set) => sum + effectiveLoad(set, ex, user) * set.reps, 0);
}

const byTime = (a: StatSession, b: StatSession) =>
  new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime();

export function e1rmSeries(
  sessions: StatSession[],
  ex: StatExercise,
  user: StatProfile,
): E1RMPoint[] {
  return [...sessions]
    .sort(byTime)
    .map((s) => {
      const best = bestSetE1RM(s, ex, user);
      if (!best) return null;
      return {
        date: s.performed_at,
        t: new Date(s.performed_at).getTime(),
        e1rm: Number(best.e1rm.toFixed(1)),
        weight_lb: best.weight_lb,
        reps: best.reps,
      };
    })
    .filter((p): p is E1RMPoint => p !== null);
}

export function tonnageSeries(
  sessions: StatSession[],
  ex: StatExercise,
  user: StatProfile,
): TonnagePoint[] {
  return [...sessions].sort(byTime).map((s) => ({
    date: s.performed_at,
    t: new Date(s.performed_at).getTime(),
    tonnage: Number(sessionTonnage(s, ex, user).toFixed(0)),
  }));
}

/** e1RM personal records: each session that set a new all-time best. */
export function prHistory(
  sessions: StatSession[],
  ex: StatExercise,
  user: StatProfile,
): E1RMPoint[] {
  const series = e1rmSeries(sessions, ex, user);
  const prs: E1RMPoint[] = [];
  let max = -Infinity;
  for (const p of series) {
    if (p.e1rm > max + 1e-9) {
      prs.push(p);
      max = p.e1rm;
    }
  }
  return prs;
}

/** Heaviest logged weight at each rep count (a rep-max table). */
export function repMaxes(
  sessions: StatSession[],
  ex: StatExercise,
  user: StatProfile,
): { reps: number; weight_lb: number; date: string }[] {
  const best = new Map<number, { weight_lb: number; date: string }>();
  for (const s of sessions) {
    for (const set of working(s)) {
      if (set.reps <= 0 || set.failed) continue;
      const cur = best.get(set.reps);
      if (!cur || set.weight_lb > cur.weight_lb) {
        best.set(set.reps, { weight_lb: set.weight_lb, date: s.performed_at });
      }
    }
  }
  return [...best.entries()]
    .map(([reps, v]) => ({ reps, ...v }))
    .sort((a, b) => a.reps - b.reps);
}

export function summarize(
  sessions: StatSession[],
  ex: StatExercise,
  user: StatProfile,
): Summary {
  const series = e1rmSeries(sessions, ex, user);
  const tonnage = tonnageSeries(sessions, ex, user);
  const first = series[0]?.e1rm ?? null;
  const current = series[series.length - 1]?.e1rm ?? null;
  const best = series.length ? Math.max(...series.map((p) => p.e1rm)) : null;
  const sorted = [...sessions].sort(byTime);
  return {
    sessionCount: sessions.length,
    currentE1RM: current,
    bestE1RM: best,
    firstE1RM: first,
    e1rmChange: first && current && first > 0 ? Number((current / first - 1).toFixed(4)) : null,
    totalTonnage: tonnage.reduce((a, p) => a + p.tonnage, 0),
    lastPerformed: sorted[sorted.length - 1]?.performed_at ?? null,
  };
}
