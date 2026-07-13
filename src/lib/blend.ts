// SPEC step 9 — blending → safety rails → rounding, in that non-negotiable order:
//
//   raw    = blend(ml, rule)          // α·ml + (1−α)·rule, on predicted e1RM
//   capped = applySafetyRails(raw)    // hard load caps
//   final  = floorTo(capped)          // floor, not round, so rails cannot be breached
//   assert(final % 2.5 === 0)
//
// Structure stays with the rule engine: ML only modulates the MAGNITUDE of a load
// increase. If the engine chose anything other than `increase_load` (deload, freeze,
// add_rep, repeat, reduce_volume), that decision — and its own rails/rounding — is
// preserved untouched. ML never overrides a veto or a deload.

import { e1RM, effectiveLoad } from './effectiveLoad';
import { snapToLoadable } from './rounding';
import type { ProgRecommendation } from './progression';
import { toSessionTarget } from './progContext';
import type { SessionTarget } from './target';
import type { Equipment, LoadType } from './types';

export interface MLPrediction {
  predicted_e1rm: number;
  completion_probability: number;
  confidence: number;
  cold_start: boolean;
}

export interface RailExercise {
  equipment: Equipment;
  load_type: LoadType;
  default_increment_lb: number;
  weight_increment_lb?: number | null;
  weight_stack_min_lb?: number | null;
}
export interface RailProfile {
  bodyweight_lb: number;
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
}

export interface RailContext {
  priorTopWeight: number; // last session's heaviest working set (logged lb)
  targetReps: number; // reps the target is prescribed at
  bestHistoricalE1RM: number;
  baselineWeeklyE1RM?: number; // e1RM ~7 days ago, for the weekly-increase cap
  trainingAgeMonths: number;
  acwr: number;
  exercise: RailExercise;
  profile: RailProfile;
}

export interface FinalizeInput {
  rule: ProgRecommendation;
  ml: MLPrediction | null;
  sessionsLogged: number;
  rail: RailContext;
  /** Per-user cap on α from the nightly feedback job (0 = ML disabled). */
  alphaCap?: number;
}

export interface FinalTarget extends SessionTarget {
  confidence: number;
  alpha: number;
  applied: string[]; // rails that fired, for the rationale
  blended_e1rm?: number;
  rule_e1rm?: number; // logged for the nightly ML-vs-rule MAE comparison
  ml_e1rm?: number;
  /** Genuine stall — the plateau breaker should offer a choice (FEATURES.md #5). */
  plateau?: boolean;
}

/** Inverse of effectiveLoad: from on-the-body load back to a logged weight. */
function loggedFromEffective(effective: number, ex: RailExercise, user: RailProfile): number {
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

const impliedE1RM = (logged: number, reps: number, ex: RailExercise, user: RailProfile) =>
  e1RM(effectiveLoad({ weight_lb: logged }, ex, user), reps);

const loggedForE1RM = (target_e1rm: number, reps: number, ex: RailExercise, user: RailProfile) =>
  loggedFromEffective(target_e1rm / (1 + reps / 30), ex, user);

/** α = min(0.8, sessions/20), forced to 0 during cold start, and clamped by the
 *  per-user cap the nightly job sets (0 when ML underperforms the rules). */
export function blendAlpha(sessionsLogged: number, coldStart: boolean, alphaCap = 1): number {
  if (coldStart) return 0;
  return Math.min(0.8, sessionsLogged / 20, Math.max(0, alphaCap));
}

export function blendE1RM(
  ruleE1RM: number,
  mlE1RM: number,
  sessionsLogged: number,
  coldStart: boolean,
  alphaCap = 1,
): { blended: number; alpha: number } {
  const alpha = blendAlpha(sessionsLogged, coldStart, alphaCap);
  return { blended: alpha * mlE1RM + (1 - alpha) * ruleE1RM, alpha };
}

/**
 * Hard load caps, applied to a candidate logged weight BEFORE rounding. Returns
 * the capped load plus which rails fired. Never returns below the prior top set —
 * an increase blend can shrink, but must not become a decrease.
 */
export function applySafetyRails(
  candidateLoad: number,
  rail: RailContext,
): { load: number; applied: string[] } {
  const { exercise: ex, profile: user, targetReps: reps } = rail;
  const applied: string[] = [];
  let load = candidateLoad;

  // 1. Session-to-session increase: the smaller of 10% and 10 lb.
  const cap1 = rail.priorTopWeight + Math.min(0.1 * rail.priorTopWeight, 10);
  if (load > cap1) {
    load = cap1;
    applied.push('capped to +10%/10 lb over last session');
  }

  // 2. Never exceed 105% of best historical e1RM.
  if (rail.bestHistoricalE1RM > 0) {
    const cap2 = loggedForE1RM(1.05 * rail.bestHistoricalE1RM, reps, ex, user);
    if (load > cap2) {
      load = cap2;
      applied.push('capped at 105% of best e1RM');
    }
  }

  // 3. Weekly e1RM increase: 5% (≤24mo training age) / 2% (>24mo).
  if (rail.baselineWeeklyE1RM && rail.baselineWeeklyE1RM > 0) {
    const pct = rail.trainingAgeMonths > 24 ? 0.02 : 0.05;
    const cap3 = loggedForE1RM(rail.baselineWeeklyE1RM * (1 + pct), reps, ex, user);
    if (load > cap3) {
      load = cap3;
      applied.push(`capped to +${pct * 100}% weekly e1RM`);
    }
  }

  // 4. ACWR over the injury threshold: hold, don't increase.
  if (rail.acwr > 1.5 && load > rail.priorTopWeight) {
    load = rail.priorTopWeight;
    applied.push('held — ACWR over 1.5');
  }

  // An increase must never round down below the current working weight.
  if (load < rail.priorTopWeight) load = rail.priorTopWeight;

  return { load, applied };
}

/**
 * Produce the final target from a rule recommendation and an optional ML
 * prediction, in the mandated order. Non-increase actions pass through the rule
 * engine unchanged (it already railed and rounded them).
 */
export function finalizeTarget(input: FinalizeInput): FinalTarget {
  const { rule, ml, sessionsLogged, rail } = input;
  const passthrough = (applied: string[] = []): FinalTarget => ({
    ...toSessionTarget(rule),
    confidence: rule.confidence,
    alpha: 0,
    applied,
    plateau: rule.plateau,
  });

  // Structure is the rule engine's: only a load increase gets ML magnitude tuning.
  if (rule.action !== 'increase_load') return passthrough();

  const coldStart = !ml || ml.cold_start;
  if (coldStart || !ml) return passthrough(['rule-based']);

  const { exercise: ex, profile: user } = rail;
  const reps = rule.target_reps;
  const ruleE1RM = impliedE1RM(rule.target_weight_lb, reps, ex, user);
  const { blended, alpha } = blendE1RM(
    ruleE1RM,
    ml.predicted_e1rm,
    sessionsLogged,
    coldStart,
    input.alphaCap ?? 1,
  );

  // α clamped to 0 (cold start or nightly gate) → rule-only, no rails re-run needed.
  if (alpha === 0) {
    return { ...passthrough(['rule-based']), rule_e1rm: ruleE1RM, ml_e1rm: ml.predicted_e1rm };
  }

  const candidate = loggedForE1RM(blended, reps, ex, user);
  const { load, applied } = applySafetyRails(candidate, { ...rail, targetReps: reps });
  const final = snapToLoadable(load, ex, user, 'floor'); // floor: rails cannot be breached

  const rationale =
    `${rule.rationale} Blended with the model (α=${alpha.toFixed(2)}, ` +
    `ML e1RM ${Math.round(ml.predicted_e1rm)} lb)` +
    (applied.length ? `; ${applied.join('; ')}.` : '.');

  return {
    target_weight_lb: final,
    target_reps: reps,
    target_sets: rule.target_sets,
    rationale,
    confidence: rule.confidence,
    alpha,
    applied,
    blended_e1rm: Number(blended.toFixed(1)),
    rule_e1rm: Number(ruleE1RM.toFixed(1)),
    ml_e1rm: Number(ml.predicted_e1rm.toFixed(1)),
  };
}
