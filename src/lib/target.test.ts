import { describe, expect, it } from 'vitest';
import { deriveInitialTarget } from './target';
import { repRangeForGoal } from './progression';
import type { Goal } from './types';

const barbell = { equipment: 'barbell' as const, is_compound: true };
const dumbbell = { equipment: 'dumbbell' as const, is_compound: false };
const GOALS: Goal[] = ['strength', 'hypertrophy', 'endurance'];

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
