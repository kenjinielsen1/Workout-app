import { describe, expect, it } from 'vitest';
import { deriveInitialTarget, seedTargetFromRepMax } from './target';
import { repRangeForGoal, targetRIRForGoal } from './progression';
import { e1RM, effectiveLoad } from './effectiveLoad';
import type { Goal } from './types';

const barbell = { equipment: 'barbell' as const, is_compound: true };
const dumbbell = { equipment: 'dumbbell' as const, is_compound: false };
const GOALS: Goal[] = ['strength', 'hypertrophy', 'endurance'];

// Fuller shapes for the seeding path, which needs load_type + rounding info.
const barbellFull = {
  equipment: 'barbell' as const,
  is_compound: true,
  load_type: 'total' as const,
  default_increment_lb: 5,
  weight_increment_lb: null,
  weight_stack_min_lb: null,
};
const dumbbellFull = {
  equipment: 'dumbbell' as const,
  is_compound: false,
  load_type: 'per_hand' as const,
  default_increment_lb: 5,
  weight_increment_lb: null,
  weight_stack_min_lb: null,
};
const user = {
  bodyweight_lb: 180,
  has_micro_plates: false,
  dumbbell_increment_lb: 5,
  plate_system: 'imperial' as const,
};

describe('deriveInitialTarget', () => {
  it('repeats the top working set of the most recent session', () => {
    const history = [
      { sets: [{ weight_lb: 185, reps: 5 }] },
      {
        sets: [
          { weight_lb: 135, reps: 5, is_warmup: true },
          { weight_lb: 205, reps: 5 },
          { weight_lb: 205, reps: 5 },
        ],
      },
    ];
    const t = deriveInitialTarget(history, barbell, 'strength');
    expect(t.target_weight_lb).toBe(205);
    expect(t.target_reps).toBe(5);
    expect(t.target_sets).toBe(2);
  });

  it('skips warmup-only sessions when finding the last working set', () => {
    const history = [
      { sets: [{ weight_lb: 225, reps: 3 }] },
      { sets: [{ weight_lb: 45, reps: 10, is_warmup: true }] },
    ];
    expect(deriveInitialTarget(history, barbell, 'strength').target_weight_lb).toBe(225);
  });

  it('falls back to an equipment-based starting weight with no history', () => {
    expect(deriveInitialTarget([], barbell, 'strength').target_weight_lb).toBe(45);
    expect(deriveInitialTarget([], dumbbell, 'strength').target_weight_lb).toBe(10);
  });

  // --- Bug 3 acceptance tests (BUGFIXES.md) --------------------------------

  it('never defaults cold-start reps to a magic 8: uses the bottom of the goal range', () => {
    // strength compound range is [3,6] — must start at 3, never 8.
    expect(deriveInitialTarget([], barbell, 'strength').target_reps).toBe(3);
  });

  it('goal test: same exercise, three goals → three range-appropriate starts', () => {
    for (const goal of GOALS) {
      const { min } = repRangeForGoal(goal, barbell.is_compound);
      expect(deriveInitialTarget([], barbell, goal).target_reps).toBe(min);
    }
    // A strength lifter never gets an 8 on a compound.
    expect(deriveInitialTarget([], barbell, 'strength').target_reps).not.toBe(8);
  });

  it('missing-data test: empty history routes to the cold-start rule, staying in range', () => {
    for (const goal of GOALS) {
      const { min, max } = repRangeForGoal(goal, barbell.is_compound);
      const reps = deriveInitialTarget([], barbell, goal).target_reps;
      expect(reps).toBeGreaterThanOrEqual(min);
      expect(reps).toBeLessThanOrEqual(max);
    }
  });
});

// --- Audit fix #5: cold-start estimation from a recent rep-max ------------
describe('seedTargetFromRepMax', () => {
  it('targets the bottom of the goal range, just like the equipment default', () => {
    for (const goal of GOALS) {
      const { min } = repRangeForGoal(goal, barbellFull.is_compound);
      expect(seedTargetFromRepMax({ weight_lb: 225, reps: 5 }, barbellFull, user, goal).target_reps).toBe(min);
    }
  });

  it('preserves the reported e1RM: the seed at (startingReps + targetRIR) matches the input e1RM', () => {
    const goal: Goal = 'strength';
    const reported = { weight_lb: 225, reps: 5 };
    const seed = seedTargetFromRepMax(reported, barbellFull, user, goal);
    const { min } = repRangeForGoal(goal, barbellFull.is_compound);
    const rir = targetRIRForGoal(goal);
    const reportedE1RM = e1RM(effectiveLoad(reported, barbellFull, user), reported.reps);
    const seedE1RM = e1RM(effectiveLoad({ weight_lb: seed.target_weight_lb }, barbellFull, user), min + rir);
    // Equal up to the loadable snap (2.5-lb grid → e1RM within a few lb).
    expect(Math.abs(seedE1RM - reportedE1RM)).toBeLessThan(6);
  });

  it('is loadable and monotonic in the reported load', () => {
    const light = seedTargetFromRepMax({ weight_lb: 135, reps: 5 }, barbellFull, user, 'strength');
    const heavy = seedTargetFromRepMax({ weight_lb: 315, reps: 5 }, barbellFull, user, 'strength');
    expect(heavy.target_weight_lb).toBeGreaterThan(light.target_weight_lb);
    for (const t of [light, heavy]) expect(t.target_weight_lb % 2.5).toBe(0); // on the loadable grid
  });

  it('handles per-hand dumbbell load and snaps to the dumbbell increment', () => {
    const seed = seedTargetFromRepMax({ weight_lb: 50, reps: 8 }, dumbbellFull, user, 'hypertrophy');
    expect(seed.target_weight_lb % 5).toBe(0); // dumbbell_increment_lb = 5
    expect(seed.target_weight_lb).toBeGreaterThan(0);
  });

  it('beats the crude equipment default when the user is clearly strong', () => {
    const seeded = seedTargetFromRepMax({ weight_lb: 315, reps: 5 }, barbellFull, user, 'strength');
    const def = deriveInitialTarget([], barbell, 'strength');
    expect(seeded.target_weight_lb).toBeGreaterThan(def.target_weight_lb); // 45-lb bar default
  });
});
