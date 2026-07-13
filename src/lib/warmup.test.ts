import { describe, expect, it } from 'vitest';
import { warmupPlan, warmupSets, type WarmupExercise, type WarmupProfile } from './warmup';

const barbell: WarmupExercise = {
  equipment: 'barbell',
  load_type: 'total',
  is_compound: true,
  default_increment_lb: 5,
};
const dumbbell: WarmupExercise = {
  equipment: 'dumbbell',
  load_type: 'per_hand',
  is_compound: true,
  default_increment_lb: 5,
};
const cableFly: WarmupExercise = {
  equipment: 'cable',
  load_type: 'total',
  is_compound: false,
  default_increment_lb: 5,
};
const profile: WarmupProfile = { has_micro_plates: true, dumbbell_increment_lb: 5 };

describe('warmupSets', () => {
  it('every warm-up is loadable, below the working weight, and flagged is_warmup', () => {
    for (const working of [95, 135, 185, 225, 315, 405]) {
      const sets = warmupSets(working, barbell, profile);
      for (const s of sets) {
        expect(s.is_warmup).toBe(true);
        expect(s.weight_lb % 2.5).toBe(0); // loadable (2.5 grid)
        expect(s.weight_lb).toBeLessThan(working);
        expect(s.weight_lb).toBeGreaterThanOrEqual(45); // barbell floor
      }
    }
  });

  it('a barbell ramp never prescribes below the empty 45 lb bar', () => {
    // 40% of 95 is 38 < 45 → the light set floors to the bar.
    const sets = warmupSets(95, barbell, profile);
    expect(Math.min(...sets.map((s) => s.weight_lb))).toBeGreaterThanOrEqual(45);
  });

  it('ramp set count scales with load; light lifts get fewer', () => {
    expect(warmupSets(95, barbell, profile).length).toBe(2); // FEATURES.md example
    expect(warmupSets(315, barbell, profile).length).toBe(4); // FEATURES.md example
    expect(warmupSets(95, barbell, profile).length).toBeLessThan(
      warmupSets(315, barbell, profile).length,
    );
  });

  it('warm-ups are strictly increasing and approach the working weight', () => {
    const sets = warmupSets(315, barbell, profile);
    for (let i = 1; i < sets.length; i++) {
      expect(sets[i]!.weight_lb).toBeGreaterThan(sets[i - 1]!.weight_lb);
    }
    expect(sets[sets.length - 1]!.weight_lb).toBeLessThan(315);
  });

  it('isolation / machine work gets a short primer, not a deep ramp', () => {
    expect(warmupSets(120, cableFly, profile).length).toBeLessThanOrEqual(2);
  });

  it('doubles nothing and stays loadable for dumbbells', () => {
    const sets = warmupSets(80, dumbbell, profile);
    for (const s of sets) {
      expect(s.weight_lb).toBeLessThan(80);
      expect(s.weight_lb % 2.5).toBe(0);
    }
  });

  it('returns nothing when the working weight is at/below the floor', () => {
    expect(warmupSets(45, barbell, profile)).toEqual([]);
  });
});

describe('warmupPlan (opt-in gate)', () => {
  it('emits zero warm-up sets when disabled', () => {
    expect(warmupPlan(315, barbell, profile, false)).toEqual([]);
  });
  it('emits the ramp when enabled', () => {
    expect(warmupPlan(315, barbell, profile, true).length).toBeGreaterThan(0);
  });
});
