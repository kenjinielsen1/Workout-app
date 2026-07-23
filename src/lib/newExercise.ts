// Turns a gym-floor quick-add (name + equipment + muscle group) into a full
// CreateExerciseInput, filling in the fields users get wrong — load_type and the
// loadable increment — from the equipment. User exercises are rule-based only and
// never enter the pooled ML set (SPEC), so a coarse movement_pattern is fine.

import type { CreateExerciseInput } from '../data/domain';
import type { Equipment, LoadType } from './types';

export const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'machine_selectorized', label: 'Machine (stack)' },
  { value: 'machine_plate', label: 'Machine (plate)' },
  { value: 'cable', label: 'Cable' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'kettlebell', label: 'Kettlebell' },
];

const LOAD_TYPE: Record<Equipment, LoadType> = {
  barbell: 'total',
  dumbbell: 'per_hand',
  kettlebell: 'total',
  machine_selectorized: 'total',
  machine_plate: 'per_side',
  cable: 'total',
  bodyweight: 'bodyweight_plus',
  band: 'total',
};

const INCREMENT: Record<Equipment, number> = {
  barbell: 5,
  dumbbell: 5,
  kettlebell: 5,
  machine_selectorized: 10,
  machine_plate: 10,
  cable: 5,
  bodyweight: 5,
  band: 5,
};

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'exercise'
  );
}

export function buildNewExercise(opts: {
  name: string;
  equipment: Equipment;
  /** The specific muscle this trains, so its hard sets count toward the right
   *  muscle's volume (VOLUME.md) — not a coarse group stand-in. */
  primaryMuscle: string;
}): CreateExerciseInput {
  return {
    name: opts.name.trim(),
    movement_pattern: 'isolation', // coarse default; user exercises are rule-based only
    equipment: opts.equipment,
    load_type: LOAD_TYPE[opts.equipment],
    is_compound: false,
    is_unilateral: false,
    default_increment_lb: INCREMENT[opts.equipment],
    fatigue_cost: 2,
    primary_muscles: opts.primaryMuscle ? [opts.primaryMuscle] : [],
  };
}
