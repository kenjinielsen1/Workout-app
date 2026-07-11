import {
  BAR_WEIGHT_LB,
  BARBELL_INCREMENT_NO_MICRO_LB,
  ROUNDING_INCREMENT_LB,
} from './constants';
import type { Exercise, Profile } from './types';

/**
 * Rounding & loadability.
 *
 * Hard invariant: every emitted target_weight_lb is an exact multiple of 2.5.
 * The global rounding rule and the barbell constraint are the SAME constraint —
 * loadable barbell weights are 45 + 2.5k, and every multiple of 2.5 above 45 is
 * achievable with 1.25 lb plate pairs. So there is no separate snap_to_loadable
 * branch for barbells; there is one rule.
 */

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

/** Snap to an arbitrary increment, flooring or rounding to nearest. */
function toMultiple(lb: number, increment: number, mode: 'floor' | 'nearest'): number {
  const q = lb / increment;
  const n = mode === 'floor' ? Math.floor(q) : Math.round(q);
  // Guard against binary-float dust (e.g. 0.1 + 0.2) leaving a value like 149.99999.
  return Number((n * increment).toFixed(4));
}

/** Force a raw increment onto the 2.5 grid so the global invariant always holds. */
function snapIncrementTo2p5(raw: number): number {
  const snapped = Math.round(raw / ROUNDING_INCREMENT_LB) * ROUNDING_INCREMENT_LB;
  return Math.max(ROUNDING_INCREMENT_LB, snapped);
}

/**
 * The native minimum increment for an exercise, given the lifter's equipment.
 * Always the larger of 2.5 lb and the equipment's real-world minimum, and always
 * itself a multiple of 2.5 so the emitted target stays on the 2.5 grid.
 */
export function equipmentIncrement(
  ex: Pick<Exercise, 'equipment' | 'default_increment_lb'>,
  user: Pick<Profile, 'has_micro_plates' | 'dumbbell_increment_lb'>,
): number {
  switch (ex.equipment) {
    case 'barbell':
      // Micro plates give the full 2.5 grid; without them the bar moves in 5s.
      return user.has_micro_plates
        ? ROUNDING_INCREMENT_LB
        : BARBELL_INCREMENT_NO_MICRO_LB;
    case 'dumbbell':
      return snapIncrementTo2p5(user.dumbbell_increment_lb);
    default:
      // Selectorized stacks, plate-loaded machines, cables, kettlebells, bands:
      // trust the catalog's default_increment_lb, floored to the 2.5 grid.
      return snapIncrementTo2p5(ex.default_increment_lb);
  }
}

/**
 * Snap a raw target to the nearest physically loadable weight for this exercise.
 *
 * Defaults to floor because most callers hand us a rail-bound value and flooring
 * is the only mode that cannot breach a cap. The result is always a multiple of
 * 2.5, and for barbells never below the empty-bar floor of 45 lb.
 */
export function snapToLoadable(
  rawLb: number,
  ex: Pick<Exercise, 'equipment' | 'default_increment_lb'>,
  user: Pick<Profile, 'has_micro_plates' | 'dumbbell_increment_lb'>,
  mode: 'floor' | 'nearest' = 'floor',
): number {
  const increment = equipmentIncrement(ex, user);
  let snapped = toMultiple(rawLb, increment, mode);

  if (ex.equipment === 'barbell') {
    // Barbell floor: never emit below the empty bar.
    snapped = Math.max(snapped, BAR_WEIGHT_LB);
  } else {
    // Nothing loadable is negative; clamp at zero for non-barbell equipment.
    snapped = Math.max(snapped, 0);
  }

  return Number(snapped.toFixed(4));
}

/**
 * Predicate used by tests and assertions: is `lb` a value we could actually put
 * on the equipment? Multiple of the native increment (hence of 2.5), and at or
 * above the barbell floor when applicable.
 */
export function isLoadable(
  lb: number,
  ex: Pick<Exercise, 'equipment' | 'default_increment_lb'>,
  user: Pick<Profile, 'has_micro_plates' | 'dumbbell_increment_lb'>,
): boolean {
  const increment = equipmentIncrement(ex, user);
  const onGrid = Number((lb % increment).toFixed(4)) === 0;
  const onGlobalGrid = Number((lb % ROUNDING_INCREMENT_LB).toFixed(4)) === 0;
  if (ex.equipment === 'barbell' && lb < BAR_WEIGHT_LB) return false;
  if (lb < 0) return false;
  return onGrid && onGlobalGrid;
}
