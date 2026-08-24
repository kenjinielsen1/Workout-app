// Within-session autoregulation for the LIVE path (OFFLINE_FIRST.md): after each
// logged set, compute the next set's target and a rest timer. Pure, synchronous,
// local — no network, no between-session e1RM/ACWR math (that runs on finish).
//
// This is straight-set autoregulation, not the between-session engine: it nudges
// the *next set* by one loadable increment based on how the last one went, and
// suggests rest from the reported effort.

import { equipmentIncrement, snapToLoadable } from './rounding';
import { repRangeForGoal } from './progression';
import { reversePyramidSet, type SetScheme } from './setSchemes';
import type { Equipment, Goal, LoadType } from './types';

export interface LiveExercise {
  equipment: Equipment;
  load_type: LoadType;
  default_increment_lb: number;
  is_compound: boolean;
  weight_increment_lb?: number | null;
  weight_stack_min_lb?: number | null;
}
export interface LiveProfile {
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
  /** Drives the rep range for double progression. Absent → the rep target holds,
   *  which is the pre-existing behaviour. */
  goal?: Goal;
}
export interface LastSet {
  reps: number;
  rir: number;
  failed?: boolean;
}

export interface NextSet {
  weight_lb: number;
  target_reps: number;
  rest_seconds: number;
  note: string;
}

function restSeconds(ex: LiveExercise, last: LastSet): number {
  let rest = last.failed || last.rir <= 1 ? 180 : last.rir <= 3 ? 120 : 90;
  if (!ex.is_compound) rest = Math.max(45, rest - 45); // isolation recovers faster
  return rest;
}

/**
 * The next set's prescription given how the last one went. One loadable increment
 * up when it was easy and beaten, one down when it was missed, otherwise hold.
 */
export function nextSetTarget(params: {
  currentWeight: number;
  targetReps: number;
  last: LastSet;
  exercise: LiveExercise;
  profile: LiveProfile;
  /** How this lift's sets are laid out. Absent/straight → autoregulate as before. */
  scheme?: SetScheme;
  /** The session's TOP set — the engine's number, which the scheme works from. */
  topWeightLb?: number;
  topReps?: number;
  /** 0-based index of the set about to be performed. */
  setIndex?: number;
}): NextSet {
  const { currentWeight, targetReps, last, exercise: ex, profile: user } = params;
  const step = equipmentIncrement(ex, user);
  const rest = restSeconds(ex, last);
  // Double progression: the rep target moves WITH the load. Going up means starting
  // the range again from the bottom; backing off means there are reps to chase at
  // the lighter weight. Holding the weight holds the target.
  const range = user.goal ? repRangeForGoal(user.goal, ex.is_compound) : null;
  // Judge the set against the GOAL'S RANGE, not the session target alone. That
  // target can drift above the range — the cold-start fallback repeats last
  // session's reps verbatim — and a stale high number turned a perfectly good set
  // into a "miss", dropping the weight on someone who had just beaten the range.
  const judgeAgainst = range ? Math.min(targetReps, range.max) : targetReps;

  // A chosen scheme owns the shape of the session, so the straight-set
  // autoregulator below must not fight it — dropping weight and adding reps IS the
  // plan, not a miss to be corrected.
  if (params.scheme?.kind === 'reverse_pyramid') {
    const next = reversePyramidSet({
      topWeightLb: params.topWeightLb ?? currentWeight,
      topReps: params.topReps ?? targetReps,
      setIndex: params.setIndex ?? 1,
      scheme: params.scheme,
      exercise: ex,
      profile: user,
    });
    return {
      weight_lb: next.weight_lb,
      target_reps: next.target_reps,
      rest_seconds: rest,
      note: `Reverse pyramid — drop to ${Math.round(next.weight_lb)} for ${next.target_reps}.`,
    };
  }

  // Clearly missed the target (or trained to failure short of it): back off.
  if (last.failed || last.reps < judgeAgainst - 1) {
    // Going lighter must never mean going for FEWER reps than were just performed —
    // that reads as a demotion for a set that actually went fine.
    const backedOffReps = Math.max(range ? range.max : targetReps, last.reps);
    return {
      weight_lb: snapToLoadable(currentWeight - step, ex, user, 'floor'),
      target_reps: backedOffReps,
      rest_seconds: rest,
      note: range
        ? `Backing off one increment — chase ${backedOffReps} reps here.`
        : 'Backing off one increment to keep the reps clean.',
    };
  }

  // Beat the target with reps to spare: nudge up for the next set.
  if (last.reps > judgeAgainst && last.rir >= 3) {
    return {
      weight_lb: snapToLoadable(currentWeight + step, ex, user, 'floor'),
      target_reps: range ? range.min : targetReps,
      rest_seconds: rest,
      note: range
        ? `That looked easy — up one increment, back to ${range.min} reps.`
        : 'That looked easy — up one increment.',
    };
  }

  // Ground it out to failure: hold the weight, take more rest.
  if (last.rir <= 0) {
    return {
      weight_lb: snapToLoadable(currentWeight, ex, user, 'nearest'),
      target_reps: targetReps,
      rest_seconds: rest,
      note: 'Tough set — hold here and rest up.',
    };
  }

  // On target: straight sets, hold.
  return {
    weight_lb: snapToLoadable(currentWeight, ex, user, 'nearest'),
    target_reps: targetReps,
    rest_seconds: rest,
    note: 'On track — same again.',
  };
}

export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Elapsed duration as M:SS, or H:MM:SS once past an hour. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const ss = sec.toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
