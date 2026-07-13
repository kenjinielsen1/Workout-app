// Pure row -> domain mappers. Kept separate from the Supabase store so they can be
// tested without a live database (the store is a thin shell over these).

import type { AliasRow, ExerciseRow, ProfileRow, SetRow, WorkoutRow } from './dbTypes';
import { PROFILE_DEFAULTS } from './dbTypes';
import type { AllSession, Exercise, LoggedSession, LoggedSet, Profile, Workout } from './domain';

export function rowToExercise(r: ExerciseRow): Exercise {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    movement_pattern: r.movement_pattern,
    equipment: r.equipment,
    load_type: r.load_type,
    is_compound: r.is_compound,
    is_unilateral: r.is_unilateral,
    default_increment_lb: Number(r.default_increment_lb),
    weight_increment_lb: r.weight_increment_lb == null ? null : Number(r.weight_increment_lb),
    weight_stack_min_lb: r.weight_stack_min_lb == null ? null : Number(r.weight_stack_min_lb),
    fatigue_cost: Number(r.fatigue_cost),
    primary_muscles: r.primary_muscles ?? [],
    secondary_muscles: r.secondary_muscles ?? [],
    is_system: r.is_system,
    owner_id: r.owner_id,
    variant_of: r.variant_of,
  };
}

export function rowToProfile(r: ProfileRow): Profile {
  return {
    user_id: r.user_id,
    bodyweight_lb: r.bodyweight_lb ?? PROFILE_DEFAULTS.bodyweight_lb,
    training_age_months: r.training_age_months ?? PROFILE_DEFAULTS.training_age_months,
    goal: r.goal ?? PROFILE_DEFAULTS.goal,
    sessions_per_week: r.sessions_per_week ?? PROFILE_DEFAULTS.sessions_per_week,
    has_micro_plates: r.has_micro_plates ?? PROFILE_DEFAULTS.has_micro_plates,
    dumbbell_increment_lb: Number(r.dumbbell_increment_lb ?? PROFILE_DEFAULTS.dumbbell_increment_lb),
    rir_calibration_offset: Number(r.rir_calibration_offset ?? PROFILE_DEFAULTS.rir_calibration_offset),
    ml_alpha_cap: Number(r.ml_alpha_cap ?? PROFILE_DEFAULTS.ml_alpha_cap),
    warmup_enabled: r.warmup_enabled ?? PROFILE_DEFAULTS.warmup_enabled,
    weight_unit: r.weight_unit ?? PROFILE_DEFAULTS.weight_unit,
    plate_system: r.plate_system ?? PROFILE_DEFAULTS.plate_system,
  };
}

export function defaultProfile(userId: string): Profile {
  return { user_id: userId, ...PROFILE_DEFAULTS };
}

export function rowToWorkout(r: WorkoutRow): Workout {
  return {
    id: r.id,
    user_id: r.user_id,
    performed_at: r.performed_at,
    notes: r.notes,
    session_rpe: r.session_rpe === null ? null : Number(r.session_rpe),
    sleep_quality: r.sleep_quality ?? null,
    soreness: r.soreness ?? null,
    energy: r.energy ?? null,
    readiness_score: r.readiness_score === null || r.readiness_score === undefined ? null : Number(r.readiness_score),
  };
}

export function rowToSet(r: SetRow): LoggedSet {
  return {
    id: r.id,
    workout_id: r.workout_id,
    exercise_id: r.exercise_id,
    set_number: r.set_number,
    weight_lb: Number(r.weight_lb),
    reps: r.reps,
    rir: r.rir === null ? null : Number(r.rir),
    is_warmup: r.is_warmup,
    failed: r.failed,
    tempo: r.tempo,
  };
}

export function buildAliasList(rows: AliasRow[]): Map<string, string[]> {
  const byExercise = new Map<string, string[]>();
  for (const r of rows) {
    const list = byExercise.get(r.exercise_id) ?? [];
    list.push(r.alias);
    byExercise.set(r.exercise_id, list);
  }
  return byExercise;
}

/**
 * Group a flat list of set rows for ONE exercise into per-workout sessions,
 * ordered oldest-first, sets ordered by set_number. `workouts` supplies the
 * performed_at / session_rpe for each workout id.
 */
export function groupSetsIntoSessions(
  sets: LoggedSet[],
  workouts: Map<string, Workout>,
): LoggedSession[] {
  const byWorkout = new Map<string, LoggedSet[]>();
  for (const s of sets) {
    const list = byWorkout.get(s.workout_id) ?? [];
    list.push(s);
    byWorkout.set(s.workout_id, list);
  }

  const sessions: LoggedSession[] = [];
  for (const [workoutId, workoutSets] of byWorkout) {
    const w = workouts.get(workoutId);
    if (!w) continue; // orphan set with no workout — skip defensively
    sessions.push({
      workout_id: workoutId,
      performed_at: w.performed_at,
      session_rpe: w.session_rpe,
      sets: [...workoutSets].sort((a, b) => a.set_number - b.set_number),
    });
  }

  return sessions.sort(
    (a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime(),
  );
}

/**
 * Group ALL of a user's sets into per-(workout × exercise) sessions carrying the
 * exercise_id — the cross-exercise view the feature pipeline / ACWR consume.
 */
export function groupAllSessions(sets: LoggedSet[], workouts: Map<string, Workout>): AllSession[] {
  const byKey = new Map<string, AllSession>();
  for (const s of sets) {
    const w = workouts.get(s.workout_id);
    if (!w) continue;
    const key = `${s.workout_id}::${s.exercise_id}`;
    let g = byKey.get(key);
    if (!g) {
      g = { exercise_id: s.exercise_id, performed_at: w.performed_at, session_rpe: w.session_rpe, sets: [] };
      byKey.set(key, g);
    }
    g.sets.push(s);
  }
  return [...byKey.values()]
    .map((g) => ({ ...g, sets: [...g.sets].sort((a, b) => a.set_number - b.set_number) }))
    .sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime());
}
