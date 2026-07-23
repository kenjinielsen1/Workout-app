// Maps the catalog's fine-grained muscles to the broad groups people actually
// think in ("I want to train back"), and groups exercises accordingly. Pure and
// testable; the picker UI renders whatever this returns.

export const MUSCLE_GROUP_ORDER = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
  'Other',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUP_ORDER)[number];

const MUSCLE_TO_GROUP: Record<string, MuscleGroup> = {
  pectorals: 'Chest',
  lats: 'Back',
  upper_back: 'Back',
  traps: 'Back',
  rhomboids: 'Back',
  front_delts: 'Shoulders',
  side_delts: 'Shoulders',
  rear_delts: 'Shoulders',
  biceps: 'Arms',
  triceps: 'Arms',
  brachialis: 'Arms',
  forearms: 'Arms',
  quadriceps: 'Legs',
  hamstrings: 'Legs',
  glutes: 'Legs',
  calves: 'Legs',
  adductors: 'Legs',
  hip_abductors: 'Legs',
  hip_adductors: 'Legs',
  abs: 'Core',
  obliques: 'Core',
  erectors: 'Core',
  hip_flexors: 'Core',
};

/** The broad group an exercise belongs to, from its FIRST primary muscle. */
export function groupForExercise(ex: { primary_muscles: string[] }): MuscleGroup {
  const first = ex.primary_muscles[0];
  return (first && MUSCLE_TO_GROUP[first]) || 'Other';
}

/** The fine-grained muscles in each broad group (inverse of MUSCLE_TO_GROUP), so a
 *  quick-add can pick the ACTUAL muscle it trains — not a coarse group stand-in that
 *  mis-attributes volume (VOLUME.md). 'Other' has none. */
export const MUSCLES_IN_GROUP: Record<MuscleGroup, string[]> = MUSCLE_GROUP_ORDER.reduce(
  (acc, g) => {
    acc[g] = Object.entries(MUSCLE_TO_GROUP).filter(([, group]) => group === g).map(([muscle]) => muscle);
    return acc;
  },
  {} as Record<MuscleGroup, string[]>,
);

/** "rear_delts" → "Rear delts", for muscle labels in the UI. */
export const prettyMuscleName = (m: string): string => m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export interface GroupedExercises<T> {
  group: MuscleGroup;
  exercises: T[];
}

/**
 * Group exercises by broad muscle group, in MUSCLE_GROUP_ORDER, dropping empty
 * groups and sorting each group's exercises by name. One group per exercise (its
 * first primary muscle), so nothing is duplicated.
 */
export function groupExercisesByMuscle<T extends { name: string; primary_muscles: string[] }>(
  exercises: T[],
): GroupedExercises<T>[] {
  const byGroup = new Map<MuscleGroup, T[]>();
  for (const ex of exercises) {
    const g = groupForExercise(ex);
    const list = byGroup.get(g) ?? [];
    list.push(ex);
    byGroup.set(g, list);
  }
  return MUSCLE_GROUP_ORDER.filter((g) => byGroup.has(g)).map((group) => ({
    group,
    exercises: byGroup.get(group)!.slice().sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
