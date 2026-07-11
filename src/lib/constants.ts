// Two invariants that govern the whole app:
//   1. All weights are in pounds. No metric path, no conversion layer.
//   2. All barbells are 45 lb. There is no bar_weight_lb column.

/** Every barbell is a 45 lb bar. Not configurable. */
export const BAR_WEIGHT_LB = 45;

/** Global loadability floor. Every emitted target is an exact multiple of this. */
export const ROUNDING_INCREMENT_LB = 2.5;

/** Coarser increment used when the lifter has no micro plates. */
export const BARBELL_INCREMENT_NO_MICRO_LB = 5;

/** Default per-hand jump for dumbbells when a profile doesn't override it. */
export const DEFAULT_DUMBBELL_INCREMENT_LB = 5;
