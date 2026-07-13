// Domain types shared by the pure utilities. These mirror the DB schema but are
// intentionally minimal — only the fields the load/rounding math actually reads.

import type { PlateSystem } from './units';

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'lunge'
  | 'carry'
  | 'isolation';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine_selectorized'
  | 'machine_plate'
  | 'cable'
  | 'bodyweight'
  | 'band';

/**
 * How the logged `weight_lb` maps to actual load on the body.
 * This is the field people forget, and getting it wrong is silent.
 */
export type LoadType = 'total' | 'per_side' | 'per_hand' | 'bodyweight_plus';

export type Goal = 'strength' | 'hypertrophy' | 'endurance';

/** Minimal exercise shape needed by effectiveLoad() and the rounding helpers. */
export interface Exercise {
  equipment: Equipment;
  load_type: LoadType;
  /** 5 upper / 10 lower / 2.5 isolation. Used as a rounding hint, never below 2.5. */
  default_increment_lb: number;
  /** The machine's actual selectable step (INCREMENTS.md). Null for
   *  barbell/dumbbell/plate-loaded → falls through to equipment logic. When set
   *  (catalog or per-user override) it is used verbatim, off the 2.5 grid. */
  weight_increment_lb?: number | null;
  /** Lightest selectable weight on the stack (INCREMENTS.md). Null = 0 / bar floor. */
  weight_stack_min_lb?: number | null;
}

/** Minimal set shape needed by effectiveLoad(). */
export interface WorkoutSet {
  weight_lb: number;
  reps: number;
  rir?: number | null;
  is_warmup?: boolean;
}

/** Minimal profile shape needed by the load/rounding math. */
export interface Profile {
  bodyweight_lb: number;
  has_micro_plates: boolean;
  /** Per-hand dumbbell increment; defaults to 5 in the schema. */
  dumbbell_increment_lb: number;
  /** Loadable-plate system (UNITS.md): 'metric' snaps barbells to the 20 kg grid.
   *  Absent → 'imperial'. Storage stays lb either way. */
  plate_system?: PlateSystem;
}
