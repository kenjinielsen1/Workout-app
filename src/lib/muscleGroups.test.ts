import { describe, expect, it } from 'vitest';
import { groupExercisesByMuscle, groupForExercise, MUSCLES_IN_GROUP, MUSCLE_GROUP_ORDER, prettyMuscleName } from './muscleGroups';
import { buildNewExercise } from './newExercise';
import { weeklyHardSets } from './volume';

const ex = (name: string, ...primary_muscles: string[]) => ({ name, primary_muscles });

describe('a manually-added exercise trains its chosen muscle (volume fix)', () => {
  it('MUSCLES_IN_GROUP lists the fine-grained muscles per group; every one round-trips', () => {
    for (const g of MUSCLE_GROUP_ORDER) {
      for (const m of MUSCLES_IN_GROUP[g]) expect(groupForExercise({ primary_muscles: [m] })).toBe(g);
    }
    // Legs offers the actual leg muscles, not just a stand-in.
    expect(MUSCLES_IN_GROUP.Legs).toContain('hamstrings');
    expect(MUSCLES_IN_GROUP.Legs).toContain('glutes');
    expect(prettyMuscleName('rear_delts')).toBe('Rear Delts');
  });

  it('buildNewExercise sets the exact chosen muscle so its hard sets count as volume', () => {
    const created = buildNewExercise({ name: 'Seated Leg Curl', equipment: 'machine_selectorized', primaryMuscle: 'hamstrings' });
    expect(created.primary_muscles).toEqual(['hamstrings']);

    // A logged session against it credits hamstrings, not a coarse stand-in.
    const index = new Map([['leg-curl', { primary_muscles: created.primary_muscles, secondary_muscles: [] }]]);
    const week = weeklyHardSets(
      [{ exercise_id: 'leg-curl', performed_at: '2026-07-15T18:00:00Z', sets: [{ reps: 10, rir: 1 }, { reps: 10, rir: 1 }, { reps: 10, rir: 1 }] }],
      index,
      { training_age_months: 24 },
      'hypertrophy',
    );
    expect(week.get('hamstrings')).toBe(3);
  });
});

describe('groupForExercise', () => {
  it('maps by the first primary muscle', () => {
    expect(groupForExercise(ex('Bench', 'pectorals', 'triceps'))).toBe('Chest');
    expect(groupForExercise(ex('Deadlift', 'glutes', 'hamstrings', 'erectors'))).toBe('Legs');
    expect(groupForExercise(ex('Row', 'upper_back', 'lats'))).toBe('Back');
    expect(groupForExercise(ex('Curl', 'biceps'))).toBe('Arms');
  });
  it('falls back to Other for unknown muscles', () => {
    expect(groupForExercise(ex('Mystery', 'spleen'))).toBe('Other');
    expect(groupForExercise(ex('Empty'))).toBe('Other');
  });
});

describe('groupExercisesByMuscle', () => {
  const list = [
    ex('Barbell Bench Press', 'pectorals', 'triceps'),
    ex('Dumbbell Curl', 'biceps'),
    ex('Back Squat', 'quadriceps', 'glutes'),
    ex('Barbell Row', 'upper_back'),
    ex('Overhead Press', 'front_delts'),
    ex('Cable Crunch', 'abs'),
    ex('Tricep Pushdown', 'triceps'),
  ];

  it('groups in the canonical order and drops empty groups', () => {
    const grouped = groupExercisesByMuscle(list);
    expect(grouped.map((g) => g.group)).toEqual(['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']);
    // order is a subsequence of MUSCLE_GROUP_ORDER
    const idx = grouped.map((g) => MUSCLE_GROUP_ORDER.indexOf(g.group));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });

  it('sorts exercises within a group by name and never duplicates', () => {
    const arms = groupExercisesByMuscle(list).find((g) => g.group === 'Arms')!;
    expect(arms.exercises.map((e) => e.name)).toEqual(['Dumbbell Curl', 'Tricep Pushdown']);
    const total = groupExercisesByMuscle(list).reduce((n, g) => n + g.exercises.length, 0);
    expect(total).toBe(list.length); // one group per exercise
  });
});
