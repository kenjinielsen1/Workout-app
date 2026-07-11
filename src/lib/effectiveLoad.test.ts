import { describe, expect, it } from 'vitest';
import { adjustedE1RM, e1RM, effectiveLoad } from './effectiveLoad';
import type { Exercise, LoadType, Profile } from './types';

const user: Profile = {
  bodyweight_lb: 180,
  has_micro_plates: true,
  dumbbell_increment_lb: 5,
};

function ex(load_type: LoadType): Pick<Exercise, 'load_type'> {
  return { load_type };
}

describe('effectiveLoad', () => {
  it('total: barbell 225 logged is 225 lb', () => {
    expect(effectiveLoad({ weight_lb: 225 }, ex('total'), user)).toBe(225);
  });

  it('per_hand: dumbbell tonnage is exactly 2x the logged weight', () => {
    expect(effectiveLoad({ weight_lb: 60 }, ex('per_hand'), user)).toBe(120);
    // The invariant the spec calls out explicitly.
    for (const w of [5, 12.5, 47.5, 100]) {
      expect(effectiveLoad({ weight_lb: w }, ex('per_hand'), user)).toBe(w * 2);
    }
  });

  it('per_side: plate-loaded machine doubles the per-side load', () => {
    expect(effectiveLoad({ weight_lb: 90 }, ex('per_side'), user)).toBe(180);
  });

  it('bodyweight_plus: adds bodyweight to the logged load', () => {
    expect(effectiveLoad({ weight_lb: 45 }, ex('bodyweight_plus'), user)).toBe(225);
    // Bodyweight-only (unweighted pull-up) logs 0 added.
    expect(effectiveLoad({ weight_lb: 0 }, ex('bodyweight_plus'), user)).toBe(180);
  });

  it('a per_side load mislabeled as total silently halves tonnage', () => {
    // Documents the exact silent failure the spec warns about.
    const perSide = effectiveLoad({ weight_lb: 90 }, ex('per_side'), user);
    const asTotal = effectiveLoad({ weight_lb: 90 }, ex('total'), user);
    expect(asTotal).toBe(perSide / 2);
  });
});

describe('e1RM', () => {
  it('Epley: a 1-rep set returns the weight itself', () => {
    expect(e1RM(225, 1)).toBeCloseTo(225 * (1 + 1 / 30), 10);
  });

  it('Epley scales with reps', () => {
    expect(e1RM(200, 5)).toBeCloseTo(200 * (1 + 5 / 30), 10);
  });

  it('adjustedE1RM treats RIR as extra reps', () => {
    expect(adjustedE1RM(200, 5, 2)).toBeCloseTo(e1RM(200, 7), 10);
  });

  it('RIR of 0 collapses adjusted to plain Epley', () => {
    expect(adjustedE1RM(200, 5, 0)).toBeCloseTo(e1RM(200, 5), 10);
  });
});
