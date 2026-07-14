// Shared seed data for the demo / offline bootstrap, used by both the in-memory
// store and the IndexedDB local-first store. A small curated catalog (not the full
// 143) so the app has real, searchable lifts with zero network.

import type { Exercise, LoggedSet, Workout } from './domain';

type SeedExercise = Omit<Exercise, 'id' | 'is_system' | 'owner_id' | 'variant_of'> & {
  aliases: string[];
};

// id === slug here for readability.
export const SEED: SeedExercise[] = [
  { slug: 'barbell-back-squat', name: 'Barbell Back Squat', movement_pattern: 'squat', equipment: 'barbell', load_type: 'total', is_compound: true, is_unilateral: false, default_increment_lb: 10, fatigue_cost: 5, primary_muscles: ['quadriceps', 'glutes'], secondary_muscles: ['erectors'], aliases: ['back squat', 'bb squat', 'high bar squat', 'squat'] },
  { slug: 'barbell-bench-press', name: 'Barbell Bench Press', movement_pattern: 'horizontal_push', equipment: 'barbell', load_type: 'total', is_compound: true, is_unilateral: false, default_increment_lb: 5, fatigue_cost: 4, primary_muscles: ['pectorals', 'triceps'], secondary_muscles: ['front_delts'], aliases: ['bench press', 'bench', 'flat bench', 'bb bench'] },
  { slug: 'barbell-deadlift', name: 'Barbell Deadlift', movement_pattern: 'hinge', equipment: 'barbell', load_type: 'total', is_compound: true, is_unilateral: false, default_increment_lb: 10, fatigue_cost: 5, primary_muscles: ['glutes', 'hamstrings', 'erectors'], secondary_muscles: ['lats'], aliases: ['deadlift', 'conventional deadlift', 'dead', 'bb deadlift'] },
  { slug: 'barbell-overhead-press', name: 'Barbell Overhead Press', movement_pattern: 'vertical_push', equipment: 'barbell', load_type: 'total', is_compound: true, is_unilateral: false, default_increment_lb: 5, fatigue_cost: 4, primary_muscles: ['front_delts', 'side_delts'], secondary_muscles: ['triceps'], aliases: ['overhead press', 'ohp', 'strict press', 'military press'] },
  { slug: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', movement_pattern: 'horizontal_push', equipment: 'dumbbell', load_type: 'per_hand', is_compound: true, is_unilateral: false, default_increment_lb: 5, fatigue_cost: 3, primary_muscles: ['pectorals', 'triceps'], secondary_muscles: ['front_delts'], aliases: ['db bench', 'dumbbell bench', 'flat dumbbell press', 'db flat press'] },
  { slug: 'lat-pulldown', name: 'Lat Pulldown', movement_pattern: 'vertical_pull', equipment: 'cable', load_type: 'total', is_compound: true, is_unilateral: false, default_increment_lb: 10, fatigue_cost: 2, primary_muscles: ['lats', 'upper_back'], secondary_muscles: ['biceps'], aliases: ['lat pull down', 'pulldown', 'wide grip pulldown', 'cable pulldown'] },
  { slug: 'leg-press', name: 'Leg Press', movement_pattern: 'squat', equipment: 'machine_plate', load_type: 'per_side', is_compound: true, is_unilateral: false, default_increment_lb: 10, fatigue_cost: 3, primary_muscles: ['quadriceps', 'glutes'], secondary_muscles: ['hamstrings'], aliases: ['leg press machine', '45 degree leg press', 'sled press', 'plate leg press'] },
  { slug: 'dumbbell-curl', name: 'Dumbbell Curl', movement_pattern: 'isolation', equipment: 'dumbbell', load_type: 'per_hand', is_compound: false, is_unilateral: false, default_increment_lb: 5, fatigue_cost: 1, primary_muscles: ['biceps'], secondary_muscles: ['forearms'], aliases: ['db curl', 'bicep curl', 'standing dumbbell curl', 'dumbbell bicep curl'] },
];

export function seedExercises(): { exercises: Exercise[]; aliases: Map<string, string[]> } {
  const aliases = new Map<string, string[]>();
  const exercises = SEED.map((s) => {
    const { aliases: a, ...rest } = s;
    aliases.set(s.slug, a);
    return { ...rest, id: s.slug, is_system: true, owner_id: null, variant_of: null };
  });
  return { exercises, aliases };
}

/**
 * A plausible 10-session progression so a fresh demo isn't empty. Deterministic
 * ids so re-seeding upserts rather than duplicating (idempotent bootstrap).
 */
export function demoHistory(
  userId: string,
  exerciseId = 'barbell-back-squat',
): { workouts: Workout[]; sets: LoggedSet[] } {
  const weeks: [number, number][] = [
    [185, 5], [190, 5], [195, 5], [195, 6], [205, 5],
    [210, 5], [205, 5], [215, 5], [220, 5], [225, 5],
  ];
  const workouts: Workout[] = [];
  const sets: LoggedSet[] = [];
  weeks.forEach(([w, reps], i) => {
    const wid = `demo-wk-${i}`;
    workouts.push({
      id: wid,
      user_id: userId,
      performed_at: new Date(Date.UTC(2026, 3, 1 + i * 4)).toISOString(),
      notes: null,
      session_rpe: 7,
      sleep_quality: null,
      soreness: null,
      energy: null,
      readiness_score: null,
    });
    const rows: Array<[number, number, number, boolean]> = [
      [w - 90, 5, 4, true],
      [w, reps, 2, false],
      [w, reps, 1, false],
      [w, reps - 1, 1, false],
    ];
    rows.forEach(([weight, r, rir, warm], n) => {
      sets.push({
        id: `demo-set-${i}-${n}`, workout_id: wid, exercise_id: exerciseId, set_number: n + 1,
        weight_lb: weight, reps: r, rir, is_warmup: warm, failed: false, tempo: null, pain: null,
      });
    });
  });
  return { workouts, sets };
}
