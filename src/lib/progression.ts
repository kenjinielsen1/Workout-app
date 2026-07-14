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
import * as cfg from './evidenceConfig';
import type { Equipment, Goal, LoadType, MovementPattern } from './types';

// --- tunables ---------------------------------------------------------------
// Every value here is READ from the versioned evidence config (EVIDENCE_CONFIG.md)
// — no research-derived literal is inlined. Bumping the config changes these
// without touching engine logic. Structural constants (windows, not evidence)
// stay in code.
export const SIGNAL_WEIGHTS = cfg.signalWeights();
// FEATURES.md #2 — daily check-in signal S6. When a check-in exists it takes its
// configured weight and the five base signals are scaled by (1 − weight)
// (proportional rebalance, keeps the composite in [-1,1]); a skipped check-in
// leaves the base composite untouched, so the engine behaves exactly as before.
export const S6_WEIGHT = cfg.checkinSignal().weight;
const BASE_SCALE = 1 - S6_WEIGHT;
// Asymmetry: a wrecked day is strong evidence NOT to push; a great day is weak
// evidence you should. The config caps the positive contribution below the negative.
export const S6_POSITIVE_CAP = cfg.checkinSignal().positiveCap;
export const READINESS_INCREASE = cfg.readinessThresholds().increase;
export const READINESS_ADD_REP = cfg.readinessThresholds().addRep;
export const READINESS_REPEAT = cfg.readinessThresholds().repeat;
export const READINESS_FLAG = cfg.readinessThresholds().flag;
const DELOAD_FACTOR = cfg.deloadTriggers().factor;
const E1RM_TREND_WINDOW = 4; // structural analysis window, not an evidence value
const MAX_E1RM_FRACTION = cfg.safetyCaps().maxE1rmFraction;
const DELOAD_FORCE_SESSIONS = cfg.deloadTriggers().forceAfterSessions;

const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));

// --- inputs -----------------------------------------------------------------
export interface ProgExercise {
  name?: string;
  movement_pattern: MovementPattern;
  equipment: Equipment;
  load_type: LoadType;
  is_compound: boolean;
  default_increment_lb: number;
  /** Machine step/min for INCREMENTS.md rounding (null/absent → equipment default). */
  weight_increment_lb?: number | null;
  weight_stack_min_lb?: number | null;
}

export interface ProgProfile {
  bodyweight_lb: number;
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
  goal: Goal;
  training_age_months: number;
  /** Learned per-user RIR bias (Part 6). Positive = user has more reps than they say. */
  rir_calibration_offset?: number;
  /** Number of failure-test contributions to that offset. Below the trust
   *  threshold the offset is ignored and the experience prior stands. */
  rir_calibration_n?: number;
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
  /** Today's daily-readiness modifier in [-1,1] from the session check-in
   *  (FEATURES.md #2). null/undefined = skipped → S6 neutral, no effect. */
  dailyReadiness?: number | null;
  /** This week is a PLANNED deload (PROGRAMMING.md Part A). Suppresses all load
   *  increases regardless of readiness — the scheduled deload holds. */
  plannedDeload?: boolean;
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
  /** Daily readiness from the session check-in (FEATURES.md #2). 0 when skipped. */
  s6?: number;
}

/** The three session-start check-in taps (1–5 each), or nulls when skipped. */
export interface DailyCheckin {
  sleep_quality: number | null;
  soreness: number | null; // 5 = very sore
  energy: number | null;
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
  /** A genuine stall (flat e1RM, normal fatigue) the plateau breaker should
   *  surface as a choice rather than silently deload (FEATURES.md #5). */
  plateau: boolean;
}

// ---------------------------------------------------------------------------
// Part 1 — RIR correction. Reads only training age + calibration offset, so it
// accepts any profile-like carrying those (e.g. the feature pipeline's).
export function correctedRIR(
  reported: number,
  user: Pick<ProgProfile, 'training_age_months' | 'rir_calibration_offset' | 'rir_calibration_n'>,
  reps: number,
): number {
  const experienceBias = cfg.experienceBias(user.training_age_months);
  const rp = cfg.repPenalty();
  const repPenalty = reps > rp.aboveReps ? rp.perRep * (reps - rp.aboveReps) : 0;
  const dp = cfg.distancePenalty();
  const distancePenalty = reported >= dp.atOrAboveRir ? dp.penalty : 0;
  // Trust gate (Part 6): the learned offset only bites after enough failure-test
  // contributions — one bad day can't swing it, and a new user keeps the prior.
  const trusted = (user.rir_calibration_n ?? 0) >= RIR_CALIBRATION_TRUST_N;
  const personalOffset = trusted ? (user.rir_calibration_offset ?? 0) : 0;
  return reported + experienceBias + repPenalty + distancePenalty - personalOffset;
}

/** Contributions required before the learned RIR offset is trusted (Part 6). */
export const RIR_CALIBRATION_TRUST_N = 4;

/** One failure test → the observed personal bias to fold into the offset:
 *  reps actually completed minus the reps the user predicted they'd get. */
export function rirObservedError(predictedReps: number, actualReps: number): number {
  return actualReps - predictedReps;
}

/** A failure test may ONLY be offered on non-barbell isolation work — never a
 *  heavy compound or any barbell lift (SCOPE_SAFETY.md). */
export function isCalibratable(ex: { is_compound: boolean; equipment: Equipment }): boolean {
  return !ex.is_compound && ex.equipment !== 'barbell';
}

// Part 3 — goal-specific proximity target (midpoint of the config window) and rep
// gates. Both are read from the evidence config.
export function targetRIRForGoal(goal: Goal): number {
  return cfg.targetRIR(goal);
}

export function repRangeForGoal(goal: Goal, isCompound: boolean): { min: number; max: number } {
  return cfg.repRange(goal, isCompound);
}

/** Plateau-breaker rep-range shift (FEATURES.md #5): move to a different rep
 *  range for a block to drive a new adaptation, then back. Strength→hypertrophy,
 *  hypertrophy→endurance, endurance→hypertrophy. */
export function shiftedRepRange(goal: Goal, isCompound: boolean): { min: number; max: number } {
  const next: Goal = goal === 'strength' ? 'hypertrophy' : goal === 'hypertrophy' ? 'endurance' : 'hypertrophy';
  return repRangeForGoal(next, isCompound);
}

// Part 2 — expected weekly e1RM gain as a FRACTION, by training age (config).
export function expectedWeeklyGain(user: ProgProfile): number {
  return cfg.expectedWeeklyGain(user.training_age_months);
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
  const a = cfg.acwrThresholds();
  const s4 = acwr < a.low ? 0.5 : acwr < a.elevated ? 1.0 : acwr < a.veto ? 0.0 : -1.0;

  // S5 — session RPE trend (inverted).
  const s5 = clamp(-rpeSlopeLast4(history) / 0.5);

  // S6 — daily readiness from the check-in, asymmetrically capped on the upside.
  const dr = ctx.dailyReadiness;
  const s6 = dr == null ? 0 : dr >= 0 ? dr * S6_POSITIVE_CAP : dr;

  return { s1, s2, s3, s4, s5, s6 };
}

/** Fold the session check-in into a daily modifier in [-1,1]. Skipped (any tap
 *  missing) → 0, so the engine is unaffected (FEATURES.md #2). */
export function dailyReadiness(c: DailyCheckin | null | undefined): number {
  if (!c || c.sleep_quality == null || c.soreness == null || c.energy == null) return 0;
  const sleep = (c.sleep_quality - 3) / 2; // -1..1
  const soreness = (3 - c.soreness) / 2; // inverted: sore → negative
  const energy = (c.energy - 3) / 2;
  const w = cfg.checkinSignal();
  return clamp(w.sleep * sleep + w.soreness * soreness + w.energy * energy, -1, 1);
}

/**
 * Composite readiness. Without a check-in (`hasCheckin` false) this is the
 * original five-signal blend, unchanged. With one, the base is scaled by
 * (1 − S6 weight) and S6 contributes its configured weight — a proportional
 * rebalance that keeps the range. Weights come from the evidence config.
 */
export function compositeReadiness(sig: Signals, hasCheckin = false): number {
  const base =
    SIGNAL_WEIGHTS.s1 * sig.s1 +
    SIGNAL_WEIGHTS.s2 * sig.s2 +
    SIGNAL_WEIGHTS.s3 * sig.s3 +
    SIGNAL_WEIGHTS.s4 * sig.s4 +
    SIGNAL_WEIGHTS.s5 * sig.s5;
  if (!hasCheckin) return base;
  return BASE_SCALE * base + S6_WEIGHT * (sig.s6 ?? 0);
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
  const a = cfg.acwrThresholds();
  const v = cfg.increaseVetoes();
  if (ctx.acwr > a.veto) blocks.push(`ACWR > ${a.veto} (injury-risk fatigue)`);
  if (ctx.sessionsThisExercise < v.minSessions) blocks.push(`fewer than ${v.minSessions} sessions logged (learning phase)`);
  if (ctx.daysSinceLast > v.detrainDays) blocks.push(`over ${v.detrainDays} days since last session (detraining)`);
  if (ws.some((s) => s.failed)) blocks.push('a set was logged to failure');
  const lastSet = ws[ws.length - 1]!;
  if (correctedRIR(lastSet.rir ?? 0, user, lastSet.reps) < 0.5)
    blocks.push('final set reached the load ceiling (corrected RIR < 0.5)');
  const forceDeload = ctx.sessionsSinceLastDeload >= DELOAD_FORCE_SESSIONS;
  return { blocks, forceDeload };
}

// FEATURES.md #3 — deload transparency. A genuine stall is flat e1RM with NORMAL
// fatigue and flat RPE (distinct from fatigue-masking, which is flat e1RM with
// HIGH fatigue → volume cut). Feature 5 (plateau breaker) reuses this.
export function isGenuineStall(sig: Signals, ctx: ProgContext, rpeSlope: number): boolean {
  return sig.s2 <= 0 && ctx.acwr <= cfg.acwrThresholds().elevated && Math.abs(rpeSlope) <= cfg.fatigueMasking().rpeSlopeOver;
}

/** Plain-English reasons a hold/deload fired, naming the signals responsible
 *  (most-limiting first). Empty when nothing is clearly negative. */
export function readinessReasons(sig: Signals, ctx: ProgContext): string[] {
  const out: string[] = [];
  if (sig.s2 <= 0) out.push('your e1RM has been flat');
  if (sig.s4 <= 0) out.push(`recent training load is elevated (ACWR ${ctx.acwr.toFixed(1)})`);
  if (sig.s5 < 0) out.push('sessions have been feeling harder (RPE trending up)');
  if (sig.s1 < 0) out.push('your last top set had little left in reserve');
  if (ctx.dailyReadiness != null && ctx.dailyReadiness < 0) out.push("today's readiness check-in was rough");
  if (ctx.daysSinceLast >= cfg.increaseVetoes().detrainDays) out.push(`you've had ${Math.round(ctx.daysSinceLast)} days off (some detraining)`);
  return out;
}

/** Join up to two reasons into a readable clause, or a fallback. */
function reasonClause(reasons: string[], fallback: string): string {
  const top = reasons.slice(0, 2);
  if (top.length === 0) return fallback;
  return top.length === 1 ? top[0]! : `${top[0]} and ${top[1]}`;
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
  const readiness = compositeReadiness(signals, ctx.dailyReadiness != null);
  const rpeSlope = rpeSlopeLast4(history);
  const vetoes: string[] = [];

  const confidence = clamp(
    0.3 + 0.35 * Math.abs(readiness) + Math.min(0.2, ctx.sessionsThisExercise * 0.02),
    0.2,
    0.9,
  );

  let plateau = false; // set once the action is known (below)
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
    plateau,
  });

  // Veto #7 — pain/injury freezes progression outright (wins over everything).
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

  // PROGRAMMING.md Part A — a PLANNED deload week holds regardless of readiness.
  // This is the one place a great-feeling day still backs off, on purpose.
  if (ctx.plannedDeload) {
    let w = snapToLoadable(baseWeight * DELOAD_FACTOR, ex, user, 'floor');
    if (w >= baseWeight) w = snapToLoadable(baseWeight - equipmentIncrement(ex, user), ex, user, 'floor');
    return build(
      'deload',
      w,
      range.min,
      sets,
      `${label}Planned deload: ${baseWeight} → ${w} lb × ${range.min}. A scheduled recovery week — ` +
        `it holds no matter how good today feels. This is how you stall less, not a setback.`,
    );
  }

  // Part 4 — fatigue-masking: adapting but fatigue-suppressed → cut volume, hold load.
  const fm = cfg.fatigueMasking();
  if (signals.s2 <= 0 && ctx.acwr > fm.acwrOver && rpeSlope > fm.rpeSlopeOver) {
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

  // Plateau breaker (FEATURES.md #5): a genuine stall (flat e1RM, normal fatigue,
  // flat RPE over 3+ sessions) that resolves to a hold or deload — surface a
  // choice instead of silently backing off. Never on the fatigue-masking case.
  plateau =
    ctx.sessionsThisExercise >= 3 &&
    isGenuineStall(signals, ctx, rpeSlope) &&
    (action === 'repeat' || action === 'repeat_flagged' || action === 'deload');

  // --- realize the chosen action into weight/reps -------------------------
  switch (action) {
    case 'increase_load': {
      // Magnitude cap (#9): the smaller of 10% and 10 lb.
      const caps = cfg.safetyCaps();
      const step = Math.min(loadStep(ex, user), caps.maxIncreasePct * baseWeight, caps.maxIncreaseLb);
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
      // Name the specific trigger; force-cadence deloads are planned, not reactive.
      const forced = ctx.sessionsSinceLastDeload >= DELOAD_FORCE_SESSIONS;
      const why = forced
        ? `it's been ${ctx.sessionsSinceLastDeload} sessions since your last back-off — a scheduled deload week`
        : reasonClause(readinessReasons(signals, ctx), `readiness has dropped to ${readiness.toFixed(2)}`);
      return build(
        'deload',
        w,
        range.min,
        sets,
        `${label}Deload: ${baseWeight} → ${w} lb × ${range.min}. ${capitalize(why)}. ` +
          `This is an engineered back-off, not a setback — shed the fatigue and expect to beat these numbers next week.`,
      );
    }
    case 'repeat_flagged':
      return build(
        'repeat_flagged',
        baseWeight,
        targetReps,
        sets,
        `${label}Hold ${baseWeight} lb × ${targetReps} — ` +
          `${reasonClause(readinessReasons(signals, ctx), `readiness is slipping (${readiness.toFixed(2)})`)}. ` +
          `One more soft session and I'll call a deload.`,
      );
    case 'repeat':
    default: {
      const stalled = isGenuineStall(signals, ctx, rpeSlope);
      const why = stalled
        ? `your e1RM has been flat with fresh legs — a genuine plateau, not fatigue`
        : reasonClause(readinessReasons(signals, ctx), `no clear signal to progress or back off yet`);
      return build(
        'repeat',
        baseWeight,
        targetReps,
        sets,
        `${label}Repeat ${baseWeight} lb × ${targetReps} — ${why}. ` +
          `${stalled ? 'Match it or add a rep; if it holds again, time to change something.' : 'Log it again and we reassess.'}`,
      );
    }
  }
}

function capitalize(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}
