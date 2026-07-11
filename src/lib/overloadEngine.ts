// Phase 1 — deterministic progressive-overload engine.
//
// SUPERSEDED by progression.ts (see PROGRESSION.md), which replaces the naive
// "hit reps at 2 RIR -> add weight" trigger with an evidence-based readiness
// score, RIR bias correction, and hard safety vetoes. This module is retained as
// a minimal reference/fallback and its utilities (repRange etc.) remain valid;
// new work should call recommendProgression().
//
// It is pure: no I/O, no
// randomness, no clock. Given an exercise, a profile, and the logged history for
// that one exercise, it returns the next session's prescription.
//
// Every emitted target_weight_lb is routed through snapToLoadable(), so it is
// always an exact multiple of 2.5 and physically loadable. The engine reasons
// about progression in LOGGED-weight space (what you put on the bar / grab off
// the rack) and only uses effectiveLoad()/e1RM to detect plateaus.

import { adjustedE1RM, effectiveLoad } from './effectiveLoad';
import { equipmentIncrement, snapToLoadable } from './rounding';
import type { Equipment, Goal, LoadType, MovementPattern } from './types';

// --- tunables ---------------------------------------------------------------
const DELOAD_FACTOR = 0.9; // 10% deload
const RULE_CONFIDENCE = 0.5;
const COLD_START_CONFIDENCE = 0.3;
const COLD_START_SESSIONS = 5; // < this many sessions for the exercise = cold start
const RIR_EASY = 2; // rir >= this means "room to add load"
const PLATEAU_WINDOW = 3; // consecutive sessions with no e1RM progress
const EPS = 1e-6;

// --- inputs -----------------------------------------------------------------
export interface EngineExercise {
  name?: string; // optional, only used to enrich the rationale
  movement_pattern: MovementPattern;
  equipment: Equipment;
  load_type: LoadType;
  is_compound: boolean;
  default_increment_lb: number;
}

export interface EngineProfile {
  bodyweight_lb: number;
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
  goal: Goal;
}

export interface PerformedSet {
  weight_lb: number; // as logged; meaning depends on load_type
  reps: number;
  rir?: number | null;
  is_warmup?: boolean;
  failed?: boolean;
}

export interface ExerciseSession {
  target_reps: number; // the rep target that was prescribed for this session
  sets: PerformedSet[];
  pain_flag?: boolean; // user logged a pain/injury note this session
}

// --- output -----------------------------------------------------------------
export type OverloadAction =
  | 'increase_load'
  | 'add_rep'
  | 'repeat'
  | 'deload_missed'
  | 'deload_plateau'
  | 'freeze';

export interface Prescription {
  action: OverloadAction;
  target_weight_lb: number; // loadable, in logged-weight units
  target_reps: number;
  target_sets: number;
  confidence: number; // 0..1
  rationale: string; // plain-English "why"
  is_cold_start: boolean;
}

interface RepRange {
  min: number;
  max: number;
}

// ---------------------------------------------------------------------------
// Rep ranges by goal × compound/isolation. "reset the rep range" means dropping
// target_reps back to `min`.
export function repRange(goal: Goal, isCompound: boolean): RepRange {
  switch (goal) {
    case 'strength':
      return isCompound ? { min: 3, max: 5 } : { min: 6, max: 8 };
    case 'hypertrophy':
      return isCompound ? { min: 6, max: 10 } : { min: 10, max: 15 };
    case 'endurance':
      return isCompound ? { min: 12, max: 15 } : { min: 15, max: 20 };
  }
}

function workingSets(s: ExerciseSession): PerformedSet[] {
  return s.sets.filter((x) => !x.is_warmup);
}

/** Heaviest working set; ties broken by most reps. */
function topSet(sets: PerformedSet[]): PerformedSet {
  return sets.reduce((a, b) => {
    if (b.weight_lb !== a.weight_lb) return b.weight_lb > a.weight_lb ? b : a;
    return b.reps > a.reps ? b : a;
  });
}

/** Best RIR-adjusted e1RM across a session's working sets, or null if none. */
function sessionBestE1RM(
  s: ExerciseSession,
  ex: EngineExercise,
  user: EngineProfile,
): number | null {
  const ws = workingSets(s);
  if (ws.length === 0) return null;
  return Math.max(
    ...ws.map((set) =>
      adjustedE1RM(effectiveLoad(set, ex, user), set.reps, set.rir ?? 0),
    ),
  );
}

/**
 * The load jump for an increase: the catalog's intended increment, but never
 * smaller than what the equipment can actually add (e.g. a barbell curl's 2.5 lb
 * intent becomes 5 lb without micro plates, so the jump isn't silently rounded
 * away).
 */
function loadStep(ex: EngineExercise, user: EngineProfile): number {
  return Math.max(ex.default_increment_lb, equipmentIncrement(ex, user));
}

/** Three consecutive sessions with no net e1RM improvement. */
function isPlateau(
  history: ExerciseSession[],
  ex: EngineExercise,
  user: EngineProfile,
): boolean {
  const e1rms = history
    .map((s) => sessionBestE1RM(s, ex, user))
    .filter((x): x is number => x !== null);
  if (e1rms.length < PLATEAU_WINDOW) return false;
  const window = e1rms.slice(-PLATEAU_WINDOW);
  const first = window[0]!;
  const best = Math.max(...window);
  return best <= first + EPS; // nothing beat where we started the window
}

function pct(cur: number, prev: number | null): number | null {
  if (prev === null || prev <= 0) return null;
  return (cur / prev - 1) * 100;
}

// ---------------------------------------------------------------------------
/**
 * Recommend the next session for one exercise. `history` is that exercise's
 * sessions in chronological order (oldest first); the last element is the most
 * recent. Requires at least one session with a working set — the very first
 * prescription (no history) is an onboarding concern, not the engine's job.
 */
export function recommend(
  ex: EngineExercise,
  user: EngineProfile,
  history: ExerciseSession[],
): Prescription {
  if (history.length === 0) {
    throw new Error('overload engine needs at least one logged session');
  }
  const last = history[history.length - 1]!;
  const ws = workingSets(last);
  if (ws.length === 0) {
    throw new Error('most recent session has no working sets');
  }

  const top = topSet(ws);
  // Snap the logged top-set weight onto the CURRENT equipment/profile grid before
  // reasoning about it. A weight logged with micro plates the lifter no longer has
  // (or any off-grid log) must not be echoed back as an unloadable target.
  const baseWeight = snapToLoadable(top.weight_lb, ex, user, 'nearest');
  const lastWeight = baseWeight;
  const lastTarget = last.target_reps;
  const targetSets = ws.length;
  const range = repRange(user.goal, ex.is_compound);
  const isColdStart = history.length < COLD_START_SESSIONS;
  const baseConfidence = isColdStart ? COLD_START_CONFIDENCE : RULE_CONFIDENCE;
  const step = loadStep(ex, user);

  const hitAll = ws.every((s) => !s.failed && s.reps >= lastTarget);
  const missedCount = ws.filter((s) => s.failed || s.reps < lastTarget).length;
  const topRir = top.rir ?? null;
  const label = ex.name ? `${ex.name}: ` : '';

  // A loadable weight strictly above lastWeight (guards against a floor snap
  // eating the whole increment when the logged weight was slightly off-grid).
  const increasedWeight = (): number => {
    let w = snapToLoadable(lastWeight + step, ex, user, 'floor');
    if (w <= lastWeight) w = snapToLoadable(lastWeight + step + step, ex, user, 'floor');
    return w;
  };

  // A loadable weight strictly below lastWeight (unless the barbell floor of 45
  // stops us, in which case holding at 45 is the physical minimum).
  const deloadedWeight = (): number => {
    let w = snapToLoadable(lastWeight * DELOAD_FACTOR, ex, user, 'floor');
    if (w >= lastWeight) {
      w = snapToLoadable(lastWeight - equipmentIncrement(ex, user), ex, user, 'floor');
    }
    return w;
  };

  const build = (
    action: OverloadAction,
    weight: number,
    reps: number,
    rationale: string,
    confidence = baseConfidence,
  ): Prescription => ({
    action,
    target_weight_lb: weight,
    target_reps: reps,
    target_sets: targetSets,
    confidence,
    rationale: (isColdStart ? '[rule-based] ' : '') + rationale,
    is_cold_start: isColdStart,
  });

  // 1) Pain/injury freeze — highest priority safety response.
  if (last.pain_flag) {
    return build(
      'freeze',
      lastWeight,
      lastTarget,
      `${label}holding at ${lastWeight} lb × ${lastTarget}. You logged pain last ` +
        `session — progression is frozen pending review.`,
    );
  }

  // 2) Missed target reps on 2+ sets → deload 10%.
  if (missedCount >= 2) {
    const w = deloadedWeight();
    return build(
      'deload_missed',
      w,
      lastTarget,
      `${label}deload to ${w} lb × ${lastTarget}. You missed the rep target on ` +
        `${missedCount} sets last session, so back off ~10% and rebuild.`,
    );
  }

  // 3) Hit everything with reps to spare → add load, reps unchanged (reset to the
  //    bottom of the range if we were already at the top).
  if (hitAll && topRir !== null && topRir >= RIR_EASY) {
    const w = increasedWeight();
    const nextReps = lastTarget >= range.max ? range.min : lastTarget;
    const cur = sessionBestE1RM(last, ex, user)!;
    const prev =
      history.length >= 2 ? sessionBestE1RM(history[history.length - 2]!, ex, user) : null;
    const change = pct(cur, prev);
    const e1rmNote =
      change !== null && change > 0.5
        ? ` Your top-set e1RM rose ${change.toFixed(0)}% since last session.`
        : '';
    return build(
      'increase_load',
      w,
      nextReps,
      `${label}increase to ${w} lb × ${nextReps}. You hit all ${targetSets} sets ` +
        `with ${topRir} in reserve — room to add ${step} lb.${e1rmNote}`,
    );
  }

  // 4) No progress for 3 sessions → deload and reset the rep range.
  if (isPlateau(history, ex, user)) {
    const w = deloadedWeight();
    return build(
      'deload_plateau',
      w,
      range.min,
      `${label}reset to ${w} lb × ${range.min}. e1RM has stalled for ` +
        `${PLATEAU_WINDOW} sessions — deload ~10% and rebuild through the rep range.`,
    );
  }

  // 5) Hit the reps but they were hard (rir 0-1), and there's rep headroom →
  //    keep the load, add one rep to the top set (double progression).
  if (hitAll && topRir !== null && topRir <= 1 && lastTarget < range.max) {
    const nextReps = lastTarget + 1;
    return build(
      'add_rep',
      lastWeight,
      nextReps,
      `${label}same ${lastWeight} lb, go for ${nextReps} reps. You hit the target ` +
        `but with only ${topRir} in reserve — earn the reps before the load.`,
    );
  }

  // 6) Everything else → repeat the same prescription and gather more data.
  return build(
    'repeat',
    lastWeight,
    lastTarget,
    `${label}repeat ${lastWeight} lb × ${lastTarget}. Not a clear signal to ` +
      `progress or back off yet — log it again.`,
  );
}
