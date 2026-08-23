// Domain types used across the app. Richer than the structural shapes in
// lib/types.ts — but because those lib functions accept Pick<> subsets, a domain
// Exercise/Profile satisfies them directly with no adapter.

import type { Equipment, Goal, LoadType, MovementPattern } from '../lib/types';
import type { PlateSystem, WeightUnit } from '../lib/units';
import type { PainType } from '../lib/safety';
import type { SetScheme } from '../lib/setSchemes';

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  movement_pattern: MovementPattern;
  equipment: Equipment;
  load_type: LoadType;
  is_compound: boolean;
  is_unilateral: boolean;
  default_increment_lb: number;
  /** The machine's real selectable step + lightest weight (INCREMENTS.md). Null/
   *  absent for free weights → equipment-default rounding. */
  weight_increment_lb?: number | null;
  weight_stack_min_lb?: number | null;
  fatigue_cost: number;
  primary_muscles: string[];
  secondary_muscles: string[];
  is_system: boolean;
  owner_id: string | null;
  variant_of: string | null;
}

/**
 * A saved workout (SAVED_WORKOUTS.md): WHICH exercises, in WHAT order. Nothing
 * else. There is deliberately no weight/rep/set field — those come from the engine,
 * computed fresh each session. `exercise_ids` order IS the template's `position`.
 */
export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  exercise_ids: string[];
  created_at: string;
  updated_at: string;
}

/**
 * A gym (MULTI_GYM.md). Equipment settings live HERE, not on the user: increments,
 * micro plates, dumbbell step, and plate system are properties of a building.
 * Exactly one gym per user is `is_home`.
 */
export interface Gym {
  id: string;
  user_id: string;
  name: string;
  is_home: boolean;
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
  plate_system: PlateSystem;
  created_at: string;
}

/** Per-GYM machine calibration — replaces the per-user override (INCREMENTS.md).
 *  Calibrating a cable at gym B must never touch gym A's value. */
export interface GymExerciseOverride {
  gym_id: string;
  exercise_id: string;
  weight_increment_lb: number | null;
  weight_stack_min_lb: number | null;
}

/** Legacy per-user override (INCREMENTS.md), superseded by GymExerciseOverride.
 *  Kept so pre-gym data migrates losslessly onto the home gym. */
export interface ExerciseOverride {
  user_id: string;
  exercise_id: string;
  weight_increment_lb: number | null;
  weight_stack_min_lb: number | null;
}

/** Fields needed to create a user exercise; the store assigns id/slug/owner. */
export interface CreateExerciseInput {
  name: string;
  movement_pattern: MovementPattern;
  equipment: Equipment;
  load_type: LoadType;
  is_compound: boolean;
  is_unilateral: boolean;
  default_increment_lb: number;
  fatigue_cost: number;
  primary_muscles: string[];
}

export interface Profile {
  user_id: string;
  bodyweight_lb: number;
  training_age_months: number;
  goal: Goal;
  sessions_per_week: number | null;
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
  rir_calibration_offset: number;
  /** Failure-test contributions to the offset + when last updated (audit fix #1). */
  rir_calibration_n: number;
  rir_calibration_updated: string | null;
  /** Per-user ML blend cap set by the nightly job: 1 = ML allowed, 0 = rules only. */
  ml_alpha_cap: number;
  /** Opt-in prescribed warm-up ramp (FEATURES.md #1). Off by default. */
  warmup_enabled: boolean;
  /** Display unit + loadable-plate system (UNITS.md). Storage is always lb. */
  weight_unit: WeightUnit;
  plate_system: PlateSystem;
  /** Proactive periodization on/off (PROGRAMMING.md Part A). */
  periodization_enabled: boolean;
  /** Per-muscle volume-landmark offset in sets, a delta from the config priors
   *  (audit fix #2). Keyed by fine-grained muscle name. */
  volume_calibration: Record<string, number>;
  /** Per-exercise set layout (straight, reverse pyramid…), keyed by exercise_id.
   *  Shapes the session's sets; never sets how heavy the top set is. */
  set_schemes: Record<string, SetScheme>;
}

export interface Workout {
  id: string;
  user_id: string;
  performed_at: string;
  /** Gym this session happened at (MULTI_GYM.md). Null = legacy / home. */
  gym_id?: string | null;
  notes: string | null;
  session_rpe: number | null;
  /** Session-start readiness check-in (FEATURES.md #2); null when skipped. */
  sleep_quality: number | null;
  soreness: number | null;
  energy: number | null;
  readiness_score: number | null;
}

/** The session-start check-in payload stored on a workout (FEATURES.md #2). */
export type WorkoutCheckin = Pick<
  Workout,
  'sleep_quality' | 'soreness' | 'energy' | 'readiness_score'
>;

export interface LoggedSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  weight_lb: number;
  reps: number;
  rir: number | null;
  is_warmup: boolean;
  failed: boolean;
  tempo: string | null;
  /** Pain flagged on this set (SCOPE_SAFETY.md); freezes progression. */
  pain: PainType | null;
}

/**
 * One exercise's sets from a single workout, shaped for the stats/engine layers.
 * Structurally compatible with exerciseStats' `StatSession`, so it can be passed
 * straight to the Exercise Detail screen.
 */
export interface LoggedSession {
  workout_id: string;
  performed_at: string;
  session_rpe: number | null;
  sets: LoggedSet[];
}

/**
 * One exercise within one workout, carrying its exercise_id — the cross-exercise
 * shape the feature pipeline / ACWR need. Structurally compatible with both the
 * stats `StatSession` and the feature `FeatureSession`.
 */
export interface AllSession {
  exercise_id: string;
  performed_at: string;
  /** Gym context, for scoping MACHINE history (MULTI_GYM.md). */
  gym_id?: string | null;
  session_rpe: number | null;
  sets: LoggedSet[];
}

export interface OutcomeJson {
  actual_e1rm: number | null;
  actual_top_weight: number | null;
  actual_reps: number | null;
  completed: boolean | null;
}

export interface Recommendation {
  id: string;
  user_id: string;
  exercise_id: string;
  generated_at: string;
  target_weight_lb: number;
  target_reps: number;
  target_sets: number;
  confidence: number;
  rationale: string;
  alpha: number;
  rule_pred_e1rm: number | null;
  ml_pred_e1rm: number | null;
  accepted: boolean | null;
  actual_outcome: OutcomeJson | null;
  /** Plateau-breaker resolution the user picked, if any (FEATURES.md #5). */
  plateau_choice: PlateauChoice | null;
  /** Evidence-config version that produced this recommendation (EVIDENCE_CONFIG.md). */
  config_version: number | null;
}

/** The three plateau-breaker resolutions (FEATURES.md #5). */
export type PlateauChoice = 'deload' | 'rep_range_shift' | 'variation';

/** Flattened row the nightly evaluate.py job consumes. */
export interface OutcomeRow {
  user_id: string;
  exercise_id: string;
  performed_at: string;
  rule_pred_e1rm: number | null;
  ml_pred_e1rm: number | null;
  actual_e1rm: number | null;
}
