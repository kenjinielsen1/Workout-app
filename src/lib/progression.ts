// Evidence-based progression trigger engine (PROGRESSION.md).
//
// SUPERSEDES the naive Phase 1 rules in overloadEngine.ts. An increase is emitted
// only when a composite *readiness* score clears a threshold and no hard veto
// fires — never on a single good set, never on a fixed schedule.
//
// Everything here is pure: no I/O, no clock, no randomness. Cross-cutting
// quantities the engine can't derive from one exercise's history (movement-pattern
// ACWR, days since last session, sessions since last deload, all-time best e1RM)
// are supplied on the context object and computed upstream.

import { adjustedE1RM, e1RM, effectiveLoad } from './effectiveLoad';
import { equipmentIncrement, snapToLoadable } from './rounding';
import type { Equipment, Goal, LoadType, MovementPattern } from './types';

// --- tunables (priors; ML replaces these later, never the structure) --------
export const SIGNAL_WEIGHTS = { s1: 0.3, s2: 0.25, s3: 0.2, s4: 0.15, s5: 0.1 } as const;
export const READINESS_INCREASE = 0.6;
export const READINESS_ADD_REP = 0.25;
export const READINESS_REPEAT = -0.2;
export const READINESS_FLAG = -0.5;
const DELOAD_FACTOR = 0.9;
const E1RM_TREND_WINDOW = 4;
const MAX_E1RM_FRACTION = 1.05; // never exceed 105% of best historical e1RM
const DELOAD_FORCE_SESSIONS = 24;

const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));

// --- inputs -----------------------------------------------------------------
export interface ProgExercise {
  name?: string;
  movement_pattern: MovementPattern;
  equipment: Equipment;
  load_type: LoadType;
  is_compound: boolean;
  default_increment_lb: number;
}

export interface ProgProfile {
  bodyweight_lb: number;
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
  goal: Goal;
  training_age_months: number;
  /** Learned per-user RIR bias (Part 6). Positive = user has more reps than they say. */
  rir_calibration_offset?: number;
}

export interface ProgSet {
  weight_lb: number;
  reps: number;
  rir?: number | null; // RAW reported RIR — never consumed directly, always via correctedRIR
  is_warmup?: boolean;
  failed?: boolean;
}

export interface ProgSession {
  /** ISO date; used for the day-spaced e1RM slope. */
  performed_at: string;
  target_reps: number;
  session_rpe?: number | null;
  /** A pain/injury note was logged this session. */
  pain_note?: boolean;
  sets: ProgSet[];
}

export interface ProgContext {
  exercise: ProgExercise;
  user: ProgProfile;
  /** This exercise's sessions, chronological (oldest first). Last = most recent. */
  history: ProgSession[];
  /** Movement-pattern ACWR (7d/28d tonnage, fatigue-weighted), computed upstream. */
  acwr: number;
  daysSinceLast: number;
  sessionsThisExercise: number;
  bestHistoricalE1RM: number;
  sessionsSinceLastDeload: number;
  /** Was the previous recommendation in the flag band? Two in a row → deload. */
  previousWasFlagged?: boolean;
}

// --- output -----------------------------------------------------------------
export type ProgAction =
  | 'increase_load'
  | 'add_rep'
  | 'repeat'
  | 'repeat_flagged'
  | 'deload'
  | 'reduce_volume'
  | 'freeze';

export interface Signals {
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  s5: number;
}

export interface ProgRecommendation {
  action: ProgAction;
  target_weight_lb: number;
  target_reps: number;
  target_sets: number;
  readiness: number;
  signals: Signals;
  confidence: number;
  vetoes: string[];
  rationale: string;
}

// ---------------------------------------------------------------------------
// Part 1 — RIR correction. Reads only training age + calibration offset, so it
// accepts any profile-like carrying those (e.g. the feature pipeline's).
export function correctedRIR(
  reported: number,
  user: Pick<ProgProfile, 'training_age_months' | 'rir_calibration_offset'>,
  reps: number,
): number {
  const months = user.training_age_months;
  const experienceBias =
    months < 6 ? 3.5 : months < 12 ? 2.5 : months < 24 ? 1.8 : months < 48 ? 1.2 : 1.0;
  const repPenalty = reps > 12 ? 0.15 * (reps - 12) : 0;
  const distancePenalty = reported >= 3 ? 0.5 : 0;
  const personalOffset = user.rir_calibration_offset ?? 0;
  return reported + experienceBias + repPenalty + distancePenalty - personalOffset;
}

// Part 3 — goal-specific proximity target (midpoint of the range) and rep gates.
export function targetRIRForGoal(goal: Goal): number {
  switch (goal) {
    case 'hypertrophy':
      return 2; // 1–3
    case 'strength':
      return 4; // 3–5
    case 'endurance':
      return 3; // 2–4
  }
}

export function repRangeForGoal(goal: Goal, isCompound: boolean): { min: number; max: number } {
  switch (goal) {
    case 'strength':
      return isCompound ? { min: 3, max: 6 } : { min: 6, max: 10 };
    case 'hypertrophy':
      return isCompound ? { min: 6, max: 10 } : { min: 8, max: 15 };
    case 'endurance':
      return isCompound ? { min: 12, max: 15 } : { min: 15, max: 20 };
  }
}

// Part 2 — expected weekly e1RM gain as a FRACTION, by training age.
export function expectedWeeklyGain(user: ProgProfile): number {
  const m = user.training_age_months;
  return m < 6 ? 0.02 : m < 24 ? 0.01 : m < 48 ? 0.004 : 0.002;
}

// --- helpers ----------------------------------------------------------------
function workingSets(s: ProgSession): ProgSet[] {
  return s.sets.filter((x) => !x.is_warmup);
}

function heaviestSet(sets: ProgSet[]): ProgSet {
  return sets.reduce((a, b) => {
    if (b.weight_lb !== a.weight_lb) return b.weight_lb > a.weight_lb ? b : a;
    return b.reps > a.reps ? b : a;
  });
}

/** Best RIR-corrected adjusted e1RM across a session's working sets. */
function sessionE1RM(s: ProgSession, ex: ProgExercise, user: ProgProfile): number | null {
  const ws = workingSets(s);
  if (ws.length === 0) return null;
  return Math.max(
    ...ws.map((set) =>
      adjustedE1RM(effectiveLoad(set, ex, user), set.reps, correctedRIR(set.rir ?? 0, user, set.reps)),
    ),
  );
}

/** Ordinary least-squares slope of y over x. Returns 0 if x has no spread. */
function olsSlope(points: { x: number; y: number }[]): number {
  const n = points.length;
  if (n < 2) return 0;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function daysBetween(aIso: string, bIso: string): number {
  return (new Date(bIso).getTime() - new Date(aIso).getTime()) / 86_400_000;
}

/** Slope of session_rpe over the last N sessions (per-session), or 0 if too few. */
function rpeSlopeLast4(history: ProgSession[]): number {
  const withRpe = history
    .slice(-E1RM_TREND_WINDOW)
    .filter((s) => s.session_rpe != null) as (ProgSession & { session_rpe: number })[];
  if (withRpe.length < E1RM_TREND_WINDOW) return 0;
  return olsSlope(withRpe.map((s, i) => ({ x: i, y: s.session_rpe })));
}

function loadStep(ex: ProgExercise, user: ProgProfile): number {
  return Math.max(ex.default_increment_lb, equipmentIncrement(ex, user));
}

/** Invert effectiveLoad(): from an effective (on-the-body) load to a logged weight. */
function loggedFromEffective(effective: number, ex: ProgExercise, user: ProgProfile): number {
  switch (ex.load_type) {
    case 'total':
      return effective;
    case 'per_hand':
    case 'per_side':
      return effective / 2;
    case 'bodyweight_plus':
      return effective - user.bodyweight_lb;
  }
}

// ---------------------------------------------------------------------------
// Part 2 — the five readiness signals.
export function readinessSignals(ctx: ProgContext): Signals {
  const { exercise: ex, user, history } = ctx;
  const last = history[history.length - 1]!;
  const ws = workingSets(last);
  const top = heaviestSet(ws);
  const targetRIR = targetRIRForGoal(user.goal);
  const targetReps = last.target_reps;

  // S1 — proximity margin.
  const topCorrected = correctedRIR(top.rir ?? targetRIR, user, top.reps);
  const s1 = clamp((topCorrected - targetRIR) / 2);

  // S2 — e1RM trend over the last 4 sessions, per week, vs expected.
  let s2 = 0;
  const window = history.slice(-E1RM_TREND_WINDOW);
  if (window.length >= E1RM_TREND_WINDOW) {
    const t0 = window[0]!.performed_at;
    const points = window
      .map((s) => ({ x: daysBetween(t0, s.performed_at), y: sessionE1RM(s, ex, user) }))
      .filter((p): p is { x: number; y: number } => p.y !== null);
    const current = sessionE1RM(last, ex, user);
    if (points.length >= E1RM_TREND_WINDOW && current && current > 0) {
      const slopePerDay = olsSlope(points);
      const weeklyFraction = (slopePerDay * 7) / current;
      s2 = clamp(weeklyFraction / expectedWeeklyGain(user));
    }
  }

  // S3 — rep-quality consistency across all working sets.
  const setsAtTarget = ws.filter((s) => !s.failed && s.reps >= targetReps).length;
  let s3 = (2 * setsAtTarget) / ws.length - 1;
  const lastSet = ws[ws.length - 1]!;
  if (correctedRIR(lastSet.rir ?? 0, user, lastSet.reps) < 0.5) s3 = Math.min(s3, 0);

  // S4 — fatigue state (inverted ACWR).
  const acwr = ctx.acwr;
  const s4 = acwr < 0.8 ? 0.5 : acwr < 1.3 ? 1.0 : acwr < 1.5 ? 0.0 : -1.0;

  // S5 — session RPE trend (inverted).
  const s5 = clamp(-rpeSlopeLast4(history) / 0.5);

  return { s1, s2, s3, s4, s5 };
}

export function compositeReadiness(sig: Signals): number {
  return (
    SIGNAL_WEIGHTS.s1 * sig.s1 +
    SIGNAL_WEIGHTS.s2 * sig.s2 +
    SIGNAL_WEIGHTS.s3 * sig.s3 +
    SIGNAL_WEIGHTS.s4 * sig.s4 +
    SIGNAL_WEIGHTS.s5 * sig.s5
  );
}

// Part 6 — calibration offset update (exponentially weighted).
export function updateCalibrationOffset(oldOffset: number, observedError: number): number {
  return 0.7 * oldOffset + 0.3 * observedError;
}

// ---------------------------------------------------------------------------
// Part 5 — hard vetoes that block a load increase. Returns human-readable reasons.
// `forceDeload` (#8) is returned separately because it downgrades to deload, not
// to repeat/add-rep.
function blockingVetoes(
  ctx: ProgContext,
  ws: ProgSet[],
): { blocks: string[]; forceDeload: boolean } {
  const { user } = ctx;
  const blocks: string[] = [];
  if (ctx.acwr > 1.5) blocks.push('ACWR > 1.5 (injury-risk fatigue)');
  if (ctx.sessionsThisExercise < 3) blocks.push('fewer than 3 sessions logged (learning phase)');
  if (ctx.daysSinceLast > 14) blocks.push('over 14 days since last session (detraining)');
  if (ws.some((s) => s.failed)) blocks.push('a set was logged to failure');
  const lastSet = ws[ws.length - 1]!;
  if (correctedRIR(lastSet.rir ?? 0, user, lastSet.reps) < 0.5)
    blocks.push('final set reached the load ceiling (corrected RIR < 0.5)');
  const forceDeload = ctx.sessionsSinceLastDeload >= DELOAD_FORCE_SESSIONS;
  return { blocks, forceDeload };
}

// ---------------------------------------------------------------------------
/** The main entry point: next-session prescription for one exercise. */
export function recommendProgression(ctx: ProgContext): ProgRecommendation {
  const { exercise: ex, user, history } = ctx;
  if (history.length === 0) throw new Error('progression engine needs at least one session');
  const last = history[history.length - 1]!;
  const ws = workingSets(last);
  if (ws.length === 0) throw new Error('most recent session has no working sets');

  const top = heaviestSet(ws);
  const baseWeight = snapToLoadable(top.weight_lb, ex, user, 'nearest');
  const range = repRangeForGoal(user.goal, ex.is_compound);
  const targetReps = last.target_reps;
  const sets = ws.length;
  const label = ex.name ? `${ex.name}: ` : '';

  const signals = readinessSignals(ctx);
  const readiness = compositeReadiness(signals);
  const rpeSlope = rpeSlopeLast4(history);
  const vetoes: string[] = [];

  const confidence = clamp(
    0.3 + 0.35 * Math.abs(readiness) + Math.min(0.2, ctx.sessionsThisExercise * 0.02),
    0.2,
    0.9,
  );

  const build = (
    action: ProgAction,
    weight: number,
    reps: number,
    targetSets: number,
    rationale: string,
  ): ProgRecommendation => ({
    action,
    target_weight_lb: weight,
    target_reps: reps,
    target_sets: targetSets,
    readiness: Number(readiness.toFixed(4)),
    signals,
    confidence: Number(confidence.toFixed(3)),
    vetoes,
    rationale: vetoes.length ? `${rationale} Blocked: ${vetoes.join('; ')}.` : rationale,
  });

  // Veto #7 — pain/injury freezes progression outright.
  if (last.pain_note) {
    vetoes.push('pain/injury note logged');
    return build(
      'freeze',
      baseWeight,
      targetReps,
      sets,
      `${label}freeze at ${baseWeight} lb × ${targetReps} — progression paused pending review.`,
    );
  }

  // Part 4 — fatigue-masking: adapting but fatigue-suppressed → cut volume, hold load.
  if (signals.s2 <= 0 && ctx.acwr > 1.3 && rpeSlope > 0.2) {
    const nextSets = Math.max(1, sets - 1);
    return build(
      'reduce_volume',
      baseWeight,
      targetReps,
      nextSets,
      `${label}hold ${baseWeight} lb but drop to ${nextSets} sets. e1RM is flat while ` +
        `ACWR (${ctx.acwr.toFixed(2)}) and session RPE are climbing — likely masked ` +
        `fitness, not a true stall. Shed fatigue, then re-check.`,
    );
  }

  // Readiness bands (Part 2 decision table).
  const atRepTop = ws.every((s) => s.reps >= range.max);
  let action: ProgAction;
  if (readiness >= READINESS_INCREASE) action = atRepTop ? 'increase_load' : 'add_rep';
  else if (readiness >= READINESS_ADD_REP) action = 'add_rep';
  else if (readiness >= READINESS_REPEAT) action = 'repeat';
  else if (readiness >= READINESS_FLAG) action = ctx.previousWasFlagged ? 'deload' : 'repeat_flagged';
  else action = 'deload';

  // add_rep needs rep headroom; at the cap with no increase, just repeat.
  if (action === 'add_rep' && targetReps >= range.max) action = 'repeat';

  // Part 5 — vetoes gate the increase only.
  if (action === 'increase_load') {
    const { blocks, forceDeload } = blockingVetoes(ctx, ws);
    if (forceDeload) {
      vetoes.push(`${DELOAD_FORCE_SESSIONS}+ sessions since last deload (deload week due)`);
      action = 'deload';
    } else if (blocks.length) {
      vetoes.push(...blocks);
      action = targetReps < range.max ? 'add_rep' : 'repeat';
    }
  }

  // --- realize the chosen action into weight/reps -------------------------
  switch (action) {
    case 'increase_load': {
      // Magnitude cap (#9): the smaller of 10% and 10 lb.
      const step = Math.min(loadStep(ex, user), 0.1 * baseWeight, 10);
      let w = snapToLoadable(baseWeight + step, ex, user, 'floor');
      // 105% best-e1RM cap (#6), evaluated at the reset (bottom-of-range) reps.
      const maxEffective = (MAX_E1RM_FRACTION * ctx.bestHistoricalE1RM) / (1 + range.min / 30);
      const maxLogged = loggedFromEffective(maxEffective, ex, user);
      const maxW = snapToLoadable(maxLogged, ex, user, 'floor');
      if (maxW < w) {
        w = maxW;
        vetoes.push('capped at 105% of best historical e1RM');
      }
      if (w <= baseWeight) {
        // Cap ate the whole increment — nothing to add. Hold.
        return build(
          'repeat',
          baseWeight,
          targetReps,
          sets,
          `${label}hold ${baseWeight} lb × ${targetReps} — at the e1RM ceiling, no headroom to add load.`,
        );
      }
      const nextReps = Math.min(range.min, targetReps); // reset, never raise reps on a load bump
      return build(
        'increase_load',
        w,
        nextReps,
        sets,
        `${label}increase to ${w} lb × ${nextReps} (readiness ${readiness.toFixed(2)}). ` +
          `You cleared the readiness bar with room to spare — reps reset to the bottom of the range.`,
      );
    }
    case 'add_rep': {
      const nextReps = Math.min(targetReps + 1, range.max);
      return build(
        'add_rep',
        baseWeight,
        nextReps,
        sets,
        `${label}same ${baseWeight} lb, aim for ${nextReps} reps (readiness ${readiness.toFixed(2)}). ` +
          `Building toward the top of the range before adding load.`,
      );
    }
    case 'deload': {
      let w = snapToLoadable(baseWeight * DELOAD_FACTOR, ex, user, 'floor');
      if (w >= baseWeight) w = snapToLoadable(baseWeight - equipmentIncrement(ex, user), ex, user, 'floor');
      return build(
        'deload',
        w,
        range.min,
        sets,
        `${label}deload to ${w} lb × ${range.min} (readiness ${readiness.toFixed(2)}). ` +
          `Back off ~10% and rebuild through the rep range.`,
      );
    }
    case 'repeat_flagged':
      return build(
        'repeat_flagged',
        baseWeight,
        targetReps,
        sets,
        `${label}repeat ${baseWeight} lb × ${targetReps} (readiness ${readiness.toFixed(2)}). ` +
          `Readiness is slipping — one more soft session triggers a deload.`,
      );
    case 'repeat':
    default:
      return build(
        'repeat',
        baseWeight,
        targetReps,
        sets,
        `${label}repeat ${baseWeight} lb × ${targetReps} (readiness ${readiness.toFixed(2)}). ` +
          `No clear signal to progress or back off — log it again.`,
      );
  }
}
