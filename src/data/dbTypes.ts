// Row shapes as returned by Supabase/Postgres for the tables in
// supabase/migrations/20260101000001_init.sql. Used to type query results before they pass
// through the mappers. Kept hand-written (not generated) so the app has no build
// dependency on the Supabase CLI.

import type { Equipment, Goal, LoadType, MovementPattern } from '../lib/types';

export interface ExerciseRow {
  id: string;
  slug: string;
  name: string;
  movement_pattern: MovementPattern;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: Equipment;
  load_type: LoadType;
  is_unilateral: boolean;
  is_compound: boolean;
  default_increment_lb: number;
  fatigue_cost: number;
  is_system: boolean;
  owner_id: string | null;
  variant_of: string | null;
}

export interface AliasRow {
  exercise_id: string;
  alias: string;
}

export interface WorkoutRow {
  id: string;
  user_id: string;
  performed_at: string;
  notes: string | null;
  session_rpe: number | null;
}

export interface SetRow {
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
}

export interface ProfileRow {
  user_id: string;
  bodyweight_lb: number | null;
  training_age_months: number | null;
  goal: Goal;
  sessions_per_week: number | null;
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
  rir_calibration_offset: number | null;
  ml_alpha_cap: number | null;
}

/** Profile defaults for a brand-new user (no row yet, or nullable columns). */
export const PROFILE_DEFAULTS = {
  bodyweight_lb: 175,
  training_age_months: 0,
  goal: 'hypertrophy' as Goal,
  sessions_per_week: 3,
  has_micro_plates: false,
  dumbbell_increment_lb: 5,
  rir_calibration_offset: 0,
  ml_alpha_cap: 1,
};
