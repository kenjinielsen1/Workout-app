// How a lift's sets are laid out within a session (FIXES_ENTRY / user request).
//
// The app assumed STRAIGHT sets everywhere: same weight every set, nudged up or
// down by the live autoregulator. That's one scheme among several, and it silently
// fought anyone running a different one — a reverse pyramid would get "back off one
// increment" suggestions for doing exactly what they intended.
//
// A scheme decides the SHAPE of the session's sets. It never decides how heavy the
// top set is — that still comes from the engine, from real history. The scheme is
// applied to the engine's number, not instead of it.

import { snapToLoadable } from './rounding';
import type { Equipment, LoadType } from './types';

export type SetSchemeKind = 'straight' | 'reverse_pyramid';

export interface SetScheme {
  kind: SetSchemeKind;
  /** Percent to drop per set on a reverse pyramid (10 = −10% each set). */
  dropPct?: number;
  /** Reps added per set as the weight comes down. */
  repStep?: number;
}

export const DEFAULT_DROP_PCT = 10;
export const DEFAULT_REP_STEP = 2;

export const STRAIGHT: SetScheme = { kind: 'straight' };

interface SchemeExercise {
  equipment: Equipment;
  load_type: LoadType;
  default_increment_lb: number;
  weight_increment_lb?: number | null;
  weight_stack_min_lb?: number | null;
}
interface SchemeProfile {
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
}

/**
 * The prescription for one set of a reverse pyramid: heaviest first, then a fixed
 * percentage off and a few reps on with each set.
 *
 * `setIndex` is 0-based — set 0 IS the top set, so it returns the engine's own
 * numbers untouched. Every derived weight is snapped to the gym's grid, so a
 * pyramid never prescribes something unloadable.
 */
export function reversePyramidSet(params: {
  topWeightLb: number;
  topReps: number;
  setIndex: number;
  scheme: SetScheme;
  exercise: SchemeExercise;
  profile: SchemeProfile;
}): { weight_lb: number; target_reps: number } {
  const { topWeightLb, topReps, setIndex, scheme, exercise, profile } = params;
  const drop = (scheme.dropPct ?? DEFAULT_DROP_PCT) / 100;
  const repStep = scheme.repStep ?? DEFAULT_REP_STEP;
  const n = Math.max(0, Math.floor(setIndex));

  // Compounding drop: each set is `drop` lighter than the one before it.
  const raw = topWeightLb * Math.pow(1 - drop, n);
  return {
    weight_lb: snapToLoadable(raw, exercise, profile, 'nearest'),
    target_reps: Math.max(1, Math.round(topReps + n * repStep)),
  };
}

/** Human summary for the UI, e.g. "225 × 5, 205 × 7, 185 × 9". */
export function describePyramid(params: {
  topWeightLb: number;
  topReps: number;
  sets: number;
  scheme: SetScheme;
  exercise: SchemeExercise;
  profile: SchemeProfile;
  format: (lb: number) => string;
}): string {
  const { sets, format, ...rest } = params;
  return Array.from({ length: Math.max(1, sets) }, (_, i) => {
    const s = reversePyramidSet({ ...rest, setIndex: i });
    return `${format(s.weight_lb)} × ${s.target_reps}`;
  }).join(', ');
}
