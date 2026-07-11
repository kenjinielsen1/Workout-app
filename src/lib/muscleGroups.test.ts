import { describe, expect, it } from 'vitest';
import { groupExercisesByMuscle, groupForExercise, MUSCLE_GROUP_ORDER } from './muscleGroups';

const ex = (name: string, ...primary_muscles: string[]) => ({ name, primary_muscles });

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
