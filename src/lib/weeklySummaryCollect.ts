// Assembles a WeeklySummaryInput from data the engine already produced — the impure
// bridge between the store and the pure summary builder (WEEKLY_SUMMARY.md). It
// READS existing functions (weeklyHardSets, personalLandmarks, e1rmSeries,
// prHistory, patternVolume, acwr, block state); it computes no training logic.

import type { AllSession, Exercise, Profile, Recommendation } from '../data/domain';
import { isHardSet, weeklyHardSets, weekStartOf } from './volume';
import { patternVolume } from './balance';
import { personalLandmarks } from './volumeLandmarks';
import { e1rmSeries, prHistory, sessionTonnage } from './exerciseStats';
import { acwr } from './features';
import { blockPosition, isPlannedDeloadWeek, phaseIntent } from './periodization';
import type { WeightUnit } from './units';
import type { MovementPattern } from './types';
import { reduceContributors } from './volumeSuggestions';
import type { ProgressionMove, SummaryProgression, WeeklySummaryInput } from './weeklySummary';

const DAY = 86_400_000;
const EPS = 2.5; // lb — an e1RM move smaller than this reads as "no change"

const weekMs = (weekStart: string) => Date.parse(`${weekStart}T00:00:00Z`);
const addWeeks = (weekStart: string, n: number) => weekStartOf(new Date(weekMs(weekStart) + n * 7 * DAY).toISOString());

/** Latest e1RM point that falls in the given ISO week, or null. */
function e1rmInWeek(points: { date: string; e1rm: number }[], weekStart: string): number | null {
  const inWk = points.filter((p) => weekStartOf(p.date) === weekStart);
  return inWk.length ? inWk[inWk.length - 1]!.e1rm : null;
}

export interface CollectArgs {
  weekStart: string; // Monday yyyy-mm-dd
  allSessions: AllSession[];
  index: Map<string, Exercise>;
  profile: Profile;
  unit: WeightUnit;
  generatedAt: string;
  /** The engine's prescription decisions, so increased/held/deloaded is sourced
   *  from what the engine actually decided (not inferred from e1RM). Optional —
   *  falls back to the e1RM delta when a week's recommendation is missing. */
  recommendations?: Recommendation[];
}

/** The engine's decision for an exercise this week vs last, from the prescribed
 *  target weight: the authoritative source for increased / held / deloaded. Null
 *  when either week has no recommendation (caller falls back to the e1RM delta). */
function moveFromRecs(
  recs: Recommendation[],
  weekStart: string,
  lastWeek: string,
): ProgressionMove | null {
  const latestIn = (wk: string) =>
    recs
      .filter((r) => weekStartOf(r.generated_at) === wk)
      .sort((a, b) => a.generated_at.localeCompare(b.generated_at))
      .at(-1) ?? null;
  const cur = latestIn(weekStart);
  const prev = latestIn(lastWeek);
  if (!cur || !prev) return null;
  const d = cur.target_weight_lb - prev.target_weight_lb;
  return d > EPS ? 'increased' : d < -EPS ? 'deloaded' : 'held';
}

export function collectWeeklySummary(args: CollectArgs): WeeklySummaryInput {
  const { weekStart, allSessions, index, profile, unit, generatedAt } = args;
  const goal = profile.goal;
  const weekEnd = isoDate(weekMs(weekStart) + 6 * DAY); // Sunday
  const weekEndT = weekMs(weekStart) + 7 * DAY; // exclusive end, for as-of reads
  const inWeek = (s: AllSession) => weekStartOf(s.performed_at) === weekStart;
  const weekSessions = allSessions.filter(inWeek);

  // --- 1. glance -----------------------------------------------------------
  const days = new Set(weekSessions.map((s) => s.performed_at.slice(0, 10)));
  let hardSets = 0;
  let tonnageLb = 0;
  for (const s of weekSessions) {
    const ex = index.get(s.exercise_id);
    if (!ex) continue;
    for (const set of s.sets) if (isHardSet(set, profile, goal)) hardSets += 1;
    tonnageLb += sessionTonnage(s, ex, profile);
  }

  // History depth gates 4-week trend fields.
  const earliest = allSessions.reduce<string | null>((m, s) => (m === null || s.performed_at < m ? s.performed_at : m), null);
  const hasFourWeekHistory = earliest !== null && weekMs(weekStart) - weekMs(weekStartOf(earliest)) >= 21 * DAY;

  // Block / periodization state (PROGRAMMING.md Part A) — used both for the deload
  // framing in progression and the fatigue section.
  let blockLabel: string | null = null;
  let plannedDeload = false;
  if (profile.periodization_enabled && earliest) {
    const pos = blockPosition(earliest, isoStamp(weekEndT));
    blockLabel = `${phaseIntent(pos.phase).label} · week ${pos.weekInBlock}`;
    plannedDeload = isPlannedDeloadWeek(earliest, isoStamp(weekEndT), true);
  }

  // --- 2. progression ------------------------------------------------------
  const trainedIds = [...new Set(weekSessions.map((s) => s.exercise_id))];
  const lastWeek = addWeeks(weekStart, -1);
  const fourAgo = addWeeks(weekStart, -4);
  const progression: SummaryProgression[] = [];
  for (const id of trainedIds) {
    const ex = index.get(id);
    if (!ex) continue;
    const exSessions = allSessions.filter((s) => s.exercise_id === id);
    const pts = e1rmSeries(exSessions, { load_type: ex.load_type }, { bodyweight_lb: profile.bodyweight_lb });
    const cur = e1rmInWeek(pts, weekStart);
    const prev = e1rmInWeek(pts, lastWeek);
    const prev4 = e1rmInWeek(pts, fourAgo);
    const deltaLastWeekLb = cur != null && prev != null ? cur - prev : null;
    const delta4wLb = cur != null && prev4 != null ? cur - prev4 : null;
    // Prefer the engine's actual prescription decision; fall back to the e1RM delta.
    const e1rmMove: ProgressionMove =
      deltaLastWeekLb != null && deltaLastWeekLb > EPS ? 'increased' : deltaLastWeekLb != null && deltaLastWeekLb < -EPS ? 'deloaded' : 'held';
    const exRecs = (args.recommendations ?? []).filter((r) => r.exercise_id === id);
    const move = moveFromRecs(exRecs, weekStart, lastWeek) ?? e1rmMove;

    // weeksFlat: consecutive weeks back from this one whose best e1RM ≈ current.
    let weeksFlat = 0;
    if (cur != null && (deltaLastWeekLb == null || Math.abs(deltaLastWeekLb) <= EPS)) {
      weeksFlat = 1;
      for (let w = 1; w < 12; w++) {
        const e = e1rmInWeek(pts, addWeeks(weekStart, -w));
        if (e != null && Math.abs(e - cur) <= EPS) weeksFlat += 1;
        else break;
      }
    }
    // A factual cause for a back-off (report-only): the engine's coaching rationale
    // is second-person/forward-looking, so it's NOT surfaced verbatim — only the
    // fact of a planned vs. autoregulated deload.
    const reason = move === 'deloaded' ? (plannedDeload ? '' : 'an autoregulated back-off') : '';
    progression.push({ exercise: ex.name, primaryMuscle: ex.primary_muscles[0] ?? null, currentE1RMLb: cur, deltaLastWeekLb, delta4wLb, move, reason, weeksFlat });
  }
  progression.sort((a, b) => a.exercise.localeCompare(b.exercise));

  // --- 3. volume per muscle (trained + normally-trained-but-zero) ----------
  const week = weeklyHardSets(allSessions, index, profile, goal, weekStart);
  const universe = new Set<string>();
  for (const s of allSessions) {
    const ex = index.get(s.exercise_id);
    if (ex) for (const m of [...ex.primary_muscles, ...ex.secondary_muscles]) universe.add(m);
  }
  const volume = [...universe]
    .map((muscle) => ({
      muscle,
      hardSets: week.get(muscle) ?? 0,
      landmarks: personalLandmarks(muscle, profile.volume_calibration?.[muscle] ?? 0),
    }))
    .sort((a, b) => b.hardSets - a.hardSets || a.muscle.localeCompare(b.muscle));

  // Per-exercise hard sets this week → per-muscle contributor breakdown (the
  // reduce-side lookup, VOLUME_SUGGESTIONS.md). Stored so a re-read past week is exact.
  const weekExercises = trainedIds.flatMap((id) => {
    const ex = index.get(id);
    if (!ex) return [];
    const hs = weekSessions
      .filter((s) => s.exercise_id === id)
      .reduce((n, s) => n + s.sets.filter((set) => isHardSet(set, profile, goal)).length, 0);
    return [{ id, name: ex.name, primary: ex.primary_muscles, secondary: ex.secondary_muscles, hardSets: hs }];
  });
  const contributors: Record<string, { id: string; name: string; sets: number }[]> = {};
  for (const muscle of universe) {
    const c = reduceContributors(muscle, weekExercises);
    if (c.length) contributors[muscle] = c;
  }

  // --- 4. balance ----------------------------------------------------------
  const pv = patternVolume(allSessions, index, profile, goal, isoStamp(weekEndT));
  const get = (p: MovementPattern) => pv.get(p) ?? 0;
  // Reuse the balance monitor's exact groupings (PROGRAMMING.md Part B / balance.ts):
  // push = both pressing planes, pull = both pulling planes; anterior = squat + lunge,
  // posterior = hinge. Report the ratios only — never the fix.
  const push = get('horizontal_push') + get('vertical_push');
  const pull = get('horizontal_pull') + get('vertical_pull');
  const anterior = get('squat') + get('lunge');
  const posterior = get('hinge');
  const balance: { label: string; ratio: string }[] = [];
  if (push + pull > 0) balance.push({ label: 'Push : pull', ratio: ratio(push, pull) });
  if (anterior + posterior > 0) balance.push({ label: 'Anterior : posterior', ratio: ratio(anterior, posterior) });

  // --- 5. fatigue ----------------------------------------------------------
  const weekPatternDominant = dominantPattern(pv);
  const acwrVal = weekPatternDominant ? acwr(allSessions, index, profile, weekPatternDominant, weekEndT) : null;
  const rpes = weekSessions.map((s) => s.session_rpe).filter((r): r is number => r != null);
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;

  // --- 6. PRs --------------------------------------------------------------
  const prs = trainedIds
    .flatMap((id) => {
      const ex = index.get(id);
      if (!ex) return [];
      const list = prHistory(allSessions.filter((s) => s.exercise_id === id), { load_type: ex.load_type }, { bodyweight_lb: profile.bodyweight_lb });
      return list.filter((p) => weekStartOf(p.date) === weekStart).map((p) => ({ exercise: ex.name, e1rmLb: p.e1rm }));
    })
    .sort((a, b) => b.e1rmLb - a.e1rmLb);

  return {
    weekStart,
    weekEnd,
    generatedAt,
    unit,
    sessions: days.size,
    hardSets,
    tonnageLb,
    daysTrained: days.size,
    daysPlanned: profile.sessions_per_week ?? null,
    plannedDeload,
    hasFourWeekHistory,
    progression,
    volume,
    balance,
    fatigue: { acwr: acwrVal, acwrTrend: null, avgRpe, avgReadiness: null, blockLabel },
    prs,
    contributors,
  };
}

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const isoStamp = (ms: number) => new Date(ms).toISOString();

function ratio(a: number, b: number): string {
  if (b === 0) return `${Number(a.toFixed(1))} : 0`;
  if (a === 0) return `0 : ${Number(b.toFixed(1))}`;
  return a >= b ? `${(a / b).toFixed(1)} : 1` : `1 : ${(b / a).toFixed(1)}`;
}

function dominantPattern(pv: Map<MovementPattern, number>): MovementPattern | null {
  let best: MovementPattern | null = null;
  let max = 0;
  for (const [p, v] of pv) if (v > max) ((max = v), (best = p));
  return best;
}
