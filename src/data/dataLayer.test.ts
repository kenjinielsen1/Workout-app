import { describe, expect, it } from 'vitest';
import { groupSetsIntoSessions, rowToExercise, rowToProfile, rowToSet } from './mappers';
import type { ExerciseRow, ProfileRow, SetRow } from './dbTypes';
import type { LoggedSet, Workout } from './domain';
import { createDemoStore, DEMO_USER_ID, InMemoryWorkoutStore } from './memoryStore';

describe('mappers', () => {
  it('coerces numeric-as-string columns (Postgres numerics) to numbers', () => {
    const row = {
      id: 'e1', slug: 'squat', name: 'Squat', movement_pattern: 'squat',
      primary_muscles: ['quadriceps'], secondary_muscles: [], equipment: 'barbell',
      load_type: 'total', is_unilateral: false, is_compound: true,
      default_increment_lb: '10' as unknown as number, fatigue_cost: '5' as unknown as number,
      is_system: true, owner_id: null, variant_of: null,
    } satisfies ExerciseRow;
    const ex = rowToExercise(row);
    expect(ex.default_increment_lb).toBe(10);
    expect(ex.fatigue_cost).toBe(5);
    expect(typeof ex.default_increment_lb).toBe('number');
  });

  it('applies profile defaults for null columns', () => {
    const row = {
      user_id: 'u1', bodyweight_lb: null, training_age_months: null, goal: 'strength',
      sessions_per_week: null, has_micro_plates: false, dumbbell_increment_lb: 5,
      rir_calibration_offset: null, ml_alpha_cap: null,
    } satisfies ProfileRow;
    const p = rowToProfile(row);
    expect(p.bodyweight_lb).toBe(175);
    expect(p.rir_calibration_offset).toBe(0);
    expect(p.ml_alpha_cap).toBe(1); // ML enabled by default
    expect(p.goal).toBe('strength');
  });

  it('groups sets into per-workout sessions ordered oldest-first', () => {
    const workouts = new Map<string, Workout>([
      ['w2', { id: 'w2', user_id: 'u', performed_at: '2026-01-05T00:00:00Z', notes: null, session_rpe: 8 }],
      ['w1', { id: 'w1', user_id: 'u', performed_at: '2026-01-01T00:00:00Z', notes: null, session_rpe: 7 }],
    ]);
    const sets: LoggedSet[] = [
      { id: 's3', workout_id: 'w2', exercise_id: 'e', set_number: 1, weight_lb: 210, reps: 5, rir: 2, is_warmup: false, failed: false, tempo: null },
      { id: 's2', workout_id: 'w1', exercise_id: 'e', set_number: 2, weight_lb: 205, reps: 5, rir: 1, is_warmup: false, failed: false, tempo: null },
      { id: 's1', workout_id: 'w1', exercise_id: 'e', set_number: 1, weight_lb: 205, reps: 5, rir: 2, is_warmup: false, failed: false, tempo: null },
    ];
    const sessions = groupSetsIntoSessions(sets, workouts);
    expect(sessions.map((s) => s.performed_at)).toEqual([
      '2026-01-01T00:00:00Z',
      '2026-01-05T00:00:00Z',
    ]);
    // sets within the first session are ordered by set_number
    expect(sessions[0]!.sets.map((s) => s.set_number)).toEqual([1, 2]);
    expect(sessions[0]!.session_rpe).toBe(7);
  });

  it('rowToSet coerces weight and rir', () => {
    const s = rowToSet({
      id: 's', workout_id: 'w', exercise_id: 'e', set_number: 1,
      weight_lb: '225' as unknown as number, reps: 5, rir: '2' as unknown as number,
      is_warmup: false, failed: false, tempo: null,
    } satisfies SetRow);
    expect(s.weight_lb).toBe(225);
    expect(s.rir).toBe(2);
  });
});

describe('InMemoryWorkoutStore', () => {
  it('lists the seeded system catalog', async () => {
    const store = new InMemoryWorkoutStore();
    const list = await store.listExercises(DEMO_USER_ID);
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(list.every((e) => e.is_system)).toBe(true);
  });

  it('exposes searchable name+aliases', async () => {
    const store = new InMemoryWorkoutStore();
    const searchable = await store.listSearchable(DEMO_USER_ID);
    const squat = searchable.find((e) => e.id === 'barbell-back-squat')!;
    expect(squat.aliases).toContain('bb squat');
  });

  it('demo store preloads a 10-session squat history', async () => {
    const store = createDemoStore();
    const history = await store.getExerciseHistory(DEMO_USER_ID, 'barbell-back-squat');
    expect(history).toHaveLength(10);
    expect(new Date(history[0]!.performed_at).getTime()).toBeLessThan(
      new Date(history[9]!.performed_at).getTime(),
    );
  });

  it('persists a logged set into an open workout and reads it back', async () => {
    const store = new InMemoryWorkoutStore();
    const workout = await store.startWorkout(DEMO_USER_ID);
    await store.logSet({
      workout_id: workout.id, exercise_id: 'barbell-bench-press', set_number: 1,
      weight_lb: 185, reps: 5, rir: 2, is_warmup: false, failed: false,
    });
    const history = await store.getExerciseHistory(DEMO_USER_ID, 'barbell-bench-press');
    expect(history).toHaveLength(1);
    expect(history[0]!.sets[0]!.weight_lb).toBe(185);
  });

  it('merges profile updates', async () => {
    const store = new InMemoryWorkoutStore();
    const updated = await store.upsertProfile(DEMO_USER_ID, { goal: 'strength', bodyweight_lb: 200 });
    expect(updated.goal).toBe('strength');
    expect((await store.getProfile(DEMO_USER_ID)).bodyweight_lb).toBe(200);
  });

  it('persists a recommendation, records its outcome, and exports it for the nightly job', async () => {
    const store = new InMemoryWorkoutStore();
    const id = await store.saveRecommendation({
      user_id: DEMO_USER_ID, exercise_id: 'barbell-bench-press',
      target_weight_lb: 205, target_reps: 3, target_sets: 3, confidence: 0.6,
      rationale: 'increase', alpha: 0.3, rule_pred_e1rm: 226, ml_pred_e1rm: 240,
    });
    // Before an outcome is recorded, nothing to export.
    expect(await store.exportOutcomes(DEMO_USER_ID)).toEqual([]);

    await store.recordOutcome(id, true, {
      actual_e1rm: 233, actual_top_weight: 205, actual_reps: 3, completed: true,
    });
    const rows = await store.exportOutcomes(DEMO_USER_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      exercise_id: 'barbell-bench-press',
      rule_pred_e1rm: 226,
      ml_pred_e1rm: 240,
      actual_e1rm: 233,
    });
  });
});
