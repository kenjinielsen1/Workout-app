// Feature extraction pipeline → training table (SPEC step 7).
//
// Pure. Turns a user's logged sessions into the per-(user × exercise) feature
// vector the ML layer regresses on, plus a labelled training table. The model
// consumes exercise ATTRIBUTES (movement pattern, equipment, muscles, flags), not
// exercise_id — that attribute encoding is what makes cold start work: a first-ever
// incline dumbbell press has no history, but "horizontal_push + dumbbell + compound"
// has been seen thousands of times.

import { correctedRIR } from './progression';
import { e1RM, effectiveLoad } from './effectiveLoad';
import type { Equipment, Goal, LoadType, MovementPattern } from './types';

// --- encodings --------------------------------------------------------------
export const MOVEMENT_PATTERNS: MovementPattern[] = [
  'squat', 'hinge', 'horizontal_push', 'vertical_push',
  'horizontal_pull', 'vertical_pull', 'lunge', 'carry', 'isolation',
];
export const EQUIPMENTS: Equipment[] = [
  'barbell', 'dumbbell', 'kettlebell', 'machine_selectorized',
  'machine_plate', 'cable', 'bodyweight', 'band',
];
export const PRIMARY_MUSCLE_VOCAB: string[] = [
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'erectors',
  'lats', 'upper_back', 'traps', 'pectorals', 'front_delts', 'side_delts',
  'rear_delts', 'biceps', 'triceps', 'forearms', 'abs',
];

export function oneHot<T>(value: T, vocab: readonly T[]): number[] {
  return vocab.map((v) => (v === value ? 1 : 0));
}
export function multiHot(values: string[], vocab: readonly string[]): number[] {
  const set = new Set(values);
  return vocab.map((v) => (set.has(v) ? 1 : 0));
}

// --- inputs -----------------------------------------------------------------
export interface FeatureExercise {
  id: string;
  name?: string;
  movement_pattern: MovementPattern;
  equipment: Equipment;
  load_type: LoadType;
  is_compound: boolean;
  is_unilateral: boolean;
  fatigue_cost: number;
  primary_muscles: string[];
  default_increment_lb: number;
  /** Machine step/min for INCREMENTS.md rounding; carried through to snapToLoadable. */
  weight_increment_lb?: number | null;
  weight_stack_min_lb?: number | null;
}

export interface FeatureSet {
  weight_lb: number;
  reps: number;
  rir?: number | null;
  is_warmup?: boolean;
  failed?: boolean;
}

export interface FeatureSession {
  exercise_id: string;
  performed_at: string; // ISO
  session_rpe?: number | null;
  sets: FeatureSet[];
}

export interface FeatureProfile {
  bodyweight_lb: number;
  training_age_months: number;
  goal: Goal;
  rir_calibration_offset?: number;
}

const DAY = 86_400_000;
const working = (s: FeatureSession) => s.sets.filter((x) => !x.is_warmup);
const t = (iso: string) => new Date(iso).getTime();

/** Per-session derived metrics, computed once and reused across features. */
export interface SessionMetrics {
  t: number;
  e1rm: number;
  tonnage: number;
  topCorrectedRir: number;
  rpe: number | null;
  anyFailure: boolean;
  topReps: number;
  topWeight: number;
}

function heaviest(sets: FeatureSet[]): FeatureSet {
  return sets.reduce((a, b) => {
    if (b.weight_lb !== a.weight_lb) return b.weight_lb > a.weight_lb ? b : a;
    return b.reps > a.reps ? b : a;
  });
}

export function sessionMetrics(
  s: FeatureSession,
  ex: FeatureExercise,
  user: FeatureProfile,
): SessionMetrics | null {
  const ws = working(s);
  if (ws.length === 0) return null;
  const top = heaviest(ws);
  const e1rm = Math.max(...ws.map((set) => e1RM(effectiveLoad(set, ex, user), set.reps)));
  const tonnage = ws.reduce((sum, set) => sum + effectiveLoad(set, ex, user) * set.reps, 0);
  return {
    t: t(s.performed_at),
    e1rm,
    tonnage,
    topCorrectedRir: correctedRIR(top.rir ?? 0, user, top.reps),
    rpe: s.session_rpe ?? null,
    anyFailure: ws.some((set) => set.failed),
    topReps: top.reps,
    topWeight: top.weight_lb,
  };
}

/** Metrics for one exercise's sessions strictly before `refT`, oldest-first. */
export function metricsSeries(
  sessions: FeatureSession[],
  ex: FeatureExercise,
  user: FeatureProfile,
  refT = Infinity,
): SessionMetrics[] {
  return sessions
    .filter((s) => s.exercise_id === ex.id && t(s.performed_at) < refT)
    .map((s) => sessionMetrics(s, ex, user))
    .filter((m): m is SessionMetrics => m !== null)
    .sort((a, b) => a.t - b.t);
}

function olsSlopePerWeek(points: { t: number; y: number }[]): number {
  if (points.length < 2) return 0;
  const xs = points.map((p) => p.t / DAY); // days
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = points.reduce((a, b) => a + b.y, 0) / points.length;
  let num = 0;
  let den = 0;
  points.forEach((p, i) => {
    num += (xs[i]! - mx) * (p.y - my);
    den += (xs[i]! - mx) ** 2;
  });
  return den === 0 ? 0 : (num / den) * 7; // per week
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Acute:chronic workload ratio for a movement pattern, fatigue-cost weighted.
 *  Normalized so a steady state reads ~1.0: acute(7d) / (chronic(28d) / 4). */
export function acwr(
  allSessions: FeatureSession[],
  index: Map<string, FeatureExercise>,
  user: FeatureProfile,
  pattern: MovementPattern,
  refT: number,
): number {
  let acute = 0;
  let chronic = 0;
  for (const s of allSessions) {
    const ex = index.get(s.exercise_id);
    if (!ex || ex.movement_pattern !== pattern) continue;
    const st = t(s.performed_at);
    if (st >= refT) continue;
    const age = refT - st;
    const m = sessionMetrics(s, ex, user);
    if (!m) continue;
    const weighted = m.tonnage * ex.fatigue_cost;
    if (age <= 7 * DAY) acute += weighted;
    if (age <= 28 * DAY) chronic += weighted;
  }
  const chronicWeekly = chronic / 4;
  if (chronicWeekly === 0) return acute > 0 ? 1.5 : 1.0; // no base: treat as neutral/elevated
  return acute / chronicWeekly;
}

// --- the feature vector -----------------------------------------------------
export interface FeatureVector {
  e1rm_roll3: number;
  e1rm_roll5: number;
  e1rm_roll10: number;
  e1rm_slope_4wk: number;
  e1rm_slope_8wk: number;
  days_since_last: number;
  movement_weekly_tonnage: number;
  acwr: number;
  rir_trend: number;
  failure_rate_5: number;
  rpe_trend: number;
  training_age_months: number;
  bodyweight_lb: number;
  relative_strength: number;
  is_compound: number;
  is_unilateral: number;
  fatigue_cost: number;
  movement_pattern_onehot: number[];
  equipment_onehot: number[];
  primary_muscles_multihot: number[];
}

const rollMean = (metrics: SessionMetrics[], n: number) =>
  mean(metrics.slice(-n).map((m) => m.e1rm));

const withinWeeks = (metrics: SessionMetrics[], refT: number, weeks: number) =>
  metrics.filter((m) => refT - m.t <= weeks * 7 * DAY);

/**
 * Extract the feature vector for a (user × exercise) as of `refT` (default: now),
 * using only sessions strictly before that instant. `allSessions` spans every
 * exercise (needed for movement-pattern ACWR / tonnage); `index` maps exercise ids
 * to attributes.
 */
export function extractFeatures(
  allSessions: FeatureSession[],
  ex: FeatureExercise,
  index: Map<string, FeatureExercise>,
  user: FeatureProfile,
  refT: number = Infinity,
): FeatureVector {
  const series = metricsSeries(allSessions, ex, user, refT);
  const last = series[series.length - 1];
  const currentE1RM = last?.e1rm ?? 0;

  const last5 = series.slice(-5);
  const rirPoints = last5.map((m, i) => ({ t: i * DAY, y: m.topCorrectedRir }));
  const rpePoints = last5
    .filter((m) => m.rpe !== null)
    .map((m, i) => ({ t: i * DAY, y: m.rpe as number }));

  const daysSinceLast = last && Number.isFinite(refT) ? (refT - last.t) / DAY : 0;

  // Movement-pattern weekly tonnage (last 7 days, unweighted).
  let weeklyTonnage = 0;
  for (const s of allSessions) {
    const e = index.get(s.exercise_id);
    if (!e || e.movement_pattern !== ex.movement_pattern) continue;
    const st = t(s.performed_at);
    if (st >= refT || refT - st > 7 * DAY) continue;
    const m = sessionMetrics(s, e, user);
    if (m) weeklyTonnage += m.tonnage;
  }

  return {
    e1rm_roll3: rollMean(series, 3),
    e1rm_roll5: rollMean(series, 5),
    e1rm_roll10: rollMean(series, 10),
    e1rm_slope_4wk: olsSlopePerWeek(withinWeeks(series, last?.t ?? refT, 4).map((m) => ({ t: m.t, y: m.e1rm }))),
    e1rm_slope_8wk: olsSlopePerWeek(withinWeeks(series, last?.t ?? refT, 8).map((m) => ({ t: m.t, y: m.e1rm }))),
    days_since_last: daysSinceLast,
    movement_weekly_tonnage: weeklyTonnage,
    acwr: acwr(allSessions, index, user, ex.movement_pattern, Number.isFinite(refT) ? refT : (last?.t ?? 0) + 1),
    rir_trend: olsSlopePerWeek(rirPoints),
    failure_rate_5: last5.length ? last5.filter((m) => m.anyFailure).length / last5.length : 0,
    rpe_trend: olsSlopePerWeek(rpePoints),
    training_age_months: user.training_age_months,
    bodyweight_lb: user.bodyweight_lb,
    relative_strength: user.bodyweight_lb > 0 ? currentE1RM / user.bodyweight_lb : 0,
    is_compound: ex.is_compound ? 1 : 0,
    is_unilateral: ex.is_unilateral ? 1 : 0,
    fatigue_cost: ex.fatigue_cost,
    movement_pattern_onehot: oneHot(ex.movement_pattern, MOVEMENT_PATTERNS),
    equipment_onehot: oneHot(ex.equipment, EQUIPMENTS),
    primary_muscles_multihot: multiHot(ex.primary_muscles, PRIMARY_MUSCLE_VOCAB),
  };
}

/** Stable, ordered feature names aligned with `featureVectorToArray`. */
export const FEATURE_NAMES: string[] = [
  'e1rm_roll3', 'e1rm_roll5', 'e1rm_roll10', 'e1rm_slope_4wk', 'e1rm_slope_8wk',
  'days_since_last', 'movement_weekly_tonnage', 'acwr', 'rir_trend', 'failure_rate_5',
  'rpe_trend', 'training_age_months', 'bodyweight_lb', 'relative_strength',
  'is_compound', 'is_unilateral', 'fatigue_cost',
  ...MOVEMENT_PATTERNS.map((p) => `mp_${p}`),
  ...EQUIPMENTS.map((e) => `eq_${e}`),
  ...PRIMARY_MUSCLE_VOCAB.map((m) => `mus_${m}`),
];

export function featureVectorToArray(fv: FeatureVector): number[] {
  return [
    fv.e1rm_roll3, fv.e1rm_roll5, fv.e1rm_roll10, fv.e1rm_slope_4wk, fv.e1rm_slope_8wk,
    fv.days_since_last, fv.movement_weekly_tonnage, fv.acwr, fv.rir_trend, fv.failure_rate_5,
    fv.rpe_trend, fv.training_age_months, fv.bodyweight_lb, fv.relative_strength,
    fv.is_compound, fv.is_unilateral, fv.fatigue_cost,
    ...fv.movement_pattern_onehot, ...fv.equipment_onehot, ...fv.primary_muscles_multihot,
  ];
}

// --- training table ---------------------------------------------------------
export interface TrainingRow {
  user_id: string;
  exercise_id: string;
  performed_at: string;
  features: number[];
  label_e1rm: number; // primary task: next-session achievable e1RM
  label_completed: number | null; // secondary: did the session hit its (proxied) target reps
}

/** Minimum prior sessions for an exercise before we emit a training row. */
export const MIN_PRIOR_SESSIONS = 3;

/**
 * Build the supervised training table: one row per session that has at least
 * MIN_PRIOR_SESSIONS of prior history for its exercise. Features are computed
 * strictly from data BEFORE the session; the label is the session's realized e1RM.
 *
 * The classification label uses a proxy target (the previous session's top-set
 * reps) because historical prescriptions aren't stored — documented as such until
 * recommendations are persisted and can supply the true target.
 */
export function buildTrainingTable(
  userId: string,
  allSessions: FeatureSession[],
  index: Map<string, FeatureExercise>,
  user: FeatureProfile,
): TrainingRow[] {
  const rows: TrainingRow[] = [];
  const byExercise = new Map<string, FeatureSession[]>();
  for (const s of allSessions) {
    const list = byExercise.get(s.exercise_id) ?? [];
    list.push(s);
    byExercise.set(s.exercise_id, list);
  }

  for (const [exId, sessions] of byExercise) {
    const ex = index.get(exId);
    if (!ex) continue;
    const sorted = [...sessions].sort((a, b) => t(a.performed_at) - t(b.performed_at));
    const metrics = sorted.map((s) => sessionMetrics(s, ex, user));

    for (let i = 0; i < sorted.length; i++) {
      const m = metrics[i];
      if (!m) continue;
      const priorCount = metrics.slice(0, i).filter((x) => x !== null).length;
      if (priorCount < MIN_PRIOR_SESSIONS) continue;

      const refT = t(sorted[i]!.performed_at);
      const fv = extractFeatures(allSessions, ex, index, user, refT);
      const prev = metrics[i - 1];
      const proxyTarget = prev?.topReps ?? m.topReps;
      const completed = working(sorted[i]!).every((s) => !s.failed && s.reps >= proxyTarget);

      rows.push({
        user_id: userId,
        exercise_id: exId,
        performed_at: sorted[i]!.performed_at,
        features: featureVectorToArray(fv),
        label_e1rm: Number(m.e1rm.toFixed(2)),
        label_completed: completed ? 1 : 0,
      });
    }
  }

  return rows.sort((a, b) => t(a.performed_at) - t(b.performed_at));
}
