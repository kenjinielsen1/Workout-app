// Within-session autoregulation for the LIVE path (OFFLINE_FIRST.md): after each
// logged set, compute the next set's target and a rest timer. Pure, synchronous,
// local — no network, no between-session e1RM/ACWR math (that runs on finish).
//
// This is straight-set autoregulation, not the between-session engine: it nudges
// the *next set* by one loadable increment based on how the last one went, and
// suggests rest from the reported effort.

import { equipmentIncrement, snapToLoadable } from './rounding';
import type { Equipment, LoadType } from './types';

export interface LiveExercise {
  equipment: Equipment;
  load_type: LoadType;
  default_increment_lb: number;
  is_compound: boolean;
}
export interface LiveProfile {
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
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
}): NextSet {
  const { currentWeight, targetReps, last, exercise: ex, profile: user } = params;
  const step = equipmentIncrement(ex, user);
  const rest = restSeconds(ex, last);

  // Clearly missed the target (or trained to failure short of it): back off.
  if (last.failed || last.reps < targetReps - 1) {
    return {
      weight_lb: snapToLoadable(currentWeight - step, ex, user, 'floor'),
      target_reps: targetReps,
      rest_seconds: rest,
      note: 'Backing off one increment to keep the reps clean.',
    };
  }

  // Beat the target with reps to spare: nudge up for the next set.
  if (last.reps > targetReps && last.rir >= 3) {
    return {
      weight_lb: snapToLoadable(currentWeight + step, ex, user, 'floor'),
      target_reps: targetReps,
      rest_seconds: rest,
      note: 'That looked easy — up one increment.',
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
