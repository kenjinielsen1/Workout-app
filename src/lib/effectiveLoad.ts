import type { Exercise, Profile, WorkoutSet } from './types';

/**
 * Single source of truth for turning a logged set into actual load on the body.
 *
 * Every tonnage, e1RM, and ML feature calculation routes through this one
 * function. Never inline this math anywhere else — a plate-loaded leg press
 * logged as `total` instead of `per_side` silently halves tonnage and poisons
 * the ACWR with no error thrown.
 *
 * Returns pounds.
 */
export function effectiveLoad(
  set: Pick<WorkoutSet, 'weight_lb'>,
  ex: Pick<Exercise, 'load_type'>,
  user: Pick<Profile, 'bodyweight_lb'>,
): number {
  switch (ex.load_type) {
    case 'total':
      // Barbell / most machines: 225 logged = 225 lb.
      return set.weight_lb;
    case 'per_hand':
      // Two dumbbells: 60 logged = 120 lb total.
      return set.weight_lb * 2;
    case 'per_side':
      // Plate-loaded machines: weight is what's hung on one side.
      return set.weight_lb * 2;
    case 'bodyweight_plus':
      // Dips, pull-ups: bodyweight plus any added load.
      return user.bodyweight_lb + set.weight_lb;
    default: {
      // Exhaustiveness guard: a new LoadType must update this switch.
      const _never: never = ex.load_type;
      throw new Error(`Unhandled load_type: ${String(_never)}`);
    }
  }
}

/** Epley e1RM from raw achievable load. Feed it effectiveLoad() output, not weight_lb. */
export function e1RM(effective_lb: number, reps: number): number {
  return effective_lb * (1 + reps / 30);
}

/** RIR-adjusted e1RM: treats reps-in-reserve as reps you could have done. */
export function adjustedE1RM(effective_lb: number, reps: number, rir: number): number {
  return effective_lb * (1 + (reps + rir) / 30);
}
