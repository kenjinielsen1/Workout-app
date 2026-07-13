import {
  BAR_WEIGHT_LB,
  BARBELL_INCREMENT_NO_MICRO_LB,
  ROUNDING_INCREMENT_LB,
} from './constants';
import type { Exercise, Profile } from './types';

/**
 * Rounding & loadability.
 *
 * Free weights (barbell, dumbbell, plate-loaded) live on the 2.5 lb grid:
 * loadable barbell weights are 45 + 2.5k, achievable with 1.25 lb plate pairs.
 *
 * Cables and selectorized machines do NOT (INCREMENTS.md): each machine has its
 * own physical step and lightest-selectable weight, so their loadable set is
 * `min + k × increment` for a per-exercise (or per-user-override) increment that
 * may be 3, 7, 15… — not necessarily a multiple of 2.5. Increment is a property
 * of the machine, carried on the exercise (`weight_increment_lb`,
 * `weight_stack_min_lb`), resolved before it reaches this module.
 */

type IncExercise = Pick<
  Exercise,
  'equipment' | 'default_increment_lb' | 'weight_increment_lb' | 'weight_stack_min_lb'
>;
type IncProfile = Pick<Profile, 'has_micro_plates' | 'dumbbell_increment_lb'>;

/** Nearest multiple of 2.5. */
export const round = (lb: number): number =>
  Math.round(lb / ROUNDING_INCREMENT_LB) * ROUNDING_INCREMENT_LB;

/**
 * Floor to a multiple of 2.5. Use this — not round — when the value is
 * safety-rail-bound: if a rail caps at 247.4 and you round to nearest you get
 * 247.5, a hair over the cap. Floor can never breach the rail.
 */
export const floorTo = (lb: number): number =>
  Math.floor(lb / ROUNDING_INCREMENT_LB) * ROUNDING_INCREMENT_LB;

/** Force a raw increment onto the 2.5 grid (free-weight equipment only). */
function snapIncrementTo2p5(raw: number): number {
  const snapped = Math.round(raw / ROUNDING_INCREMENT_LB) * ROUNDING_INCREMENT_LB;
  return Math.max(ROUNDING_INCREMENT_LB, snapped);
}

/**
 * The selectable weight step for an exercise (INCREMENTS.md resolution order):
 *   1. `weight_increment_lb` — the machine's real step (catalog value, or a
 *      per-user override merged onto the exercise upstream). Used verbatim.
 *   2. Equipment-type default.
 * Barbell/dumbbell/plate stay on the 2.5 grid; cables/selectorized do not.
 */
export function equipmentIncrement(ex: IncExercise, user: IncProfile): number {
  if (ex.weight_increment_lb != null && ex.weight_increment_lb > 0) {
    return ex.weight_increment_lb; // real machine step — NOT forced onto 2.5
  }
  switch (ex.equipment) {
    case 'barbell':
      // Micro plates give the full 2.5 grid; without them the bar moves in 5s.
      return user.has_micro_plates ? ROUNDING_INCREMENT_LB : BARBELL_INCREMENT_NO_MICRO_LB;
    case 'dumbbell':
      return snapIncrementTo2p5(user.dumbbell_increment_lb);
    case 'machine_plate':
      return ROUNDING_INCREMENT_LB; // plate-loaded → same 2.5 logic as a barbell
    case 'machine_selectorized':
    case 'cable':
      return 10; // conservative default until the catalog/override gives the real step
    default:
      // Kettlebells, bands: trust the catalog hint, floored to the 2.5 grid.
      return snapIncrementTo2p5(ex.default_increment_lb);
  }
}

/** The lightest selectable weight: the stack minimum, or the empty bar for barbells. */
function loadFloor(ex: IncExercise): number {
  if (ex.weight_stack_min_lb != null && ex.weight_stack_min_lb > 0) return ex.weight_stack_min_lb;
  return ex.equipment === 'barbell' ? BAR_WEIGHT_LB : 0;
}

/**
 * Snap a raw target to a physically selectable weight: `min + k × increment`,
 * k ≥ 0. Defaults to floor because most callers hand us a rail-bound value and
 * flooring is the only mode that cannot breach a cap. Below the minimum it
 * returns the minimum (the lightest plate/pin), never zero or negative.
 */
export function snapToLoadable(
  rawLb: number,
  ex: IncExercise,
  user: IncProfile,
  mode: 'floor' | 'nearest' = 'floor',
): number {
  const inc = equipmentIncrement(ex, user);
  const min = loadFloor(ex);
  if (rawLb <= min) return min;
  const q = (rawLb - min) / inc;
  const steps = mode === 'floor' ? Math.floor(q) : Math.round(q);
  return Number((min + steps * inc).toFixed(4));
}

/**
 * Predicate used by tests and assertions: is `lb` a value we could actually
 * select on this equipment? On the exercise's grid (`min + k × increment`) and at
 * or above its minimum.
 */
export function isLoadable(lb: number, ex: IncExercise, user: IncProfile): boolean {
  const inc = equipmentIncrement(ex, user);
  const min = loadFloor(ex);
  if (lb < min - 1e-9) return false;
  return Number(((lb - min) % inc).toFixed(4)) === 0;
}
