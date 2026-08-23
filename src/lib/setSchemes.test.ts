import { describe, expect, it } from 'vitest';
import { describePyramid, reversePyramidSet, type SetScheme } from './setSchemes';
import { lbToKg } from './units';

const bar = { equipment: 'barbell' as const, load_type: 'total' as const, default_increment_lb: 5, weight_increment_lb: null, weight_stack_min_lb: null };
const user = { has_micro_plates: true, dumbbell_increment_lb: 5 };
const rpt: SetScheme = { kind: 'reverse_pyramid' };

const setAt = (setIndex: number, scheme = rpt, topWeightLb = 225, topReps = 5) =>
  reversePyramidSet({ topWeightLb, topReps, setIndex, scheme, exercise: bar, profile: user });

describe('reverse pyramid — heavy first, then lighter with more reps', () => {
  it('set 1 is the engine\'s own top set, untouched', () => {
    expect(setAt(0)).toEqual({ weight_lb: 225, target_reps: 5 });
  });

  it('each set drops the weight and adds reps', () => {
    const s2 = setAt(1);
    const s3 = setAt(2);
    expect(s2.weight_lb).toBeLessThan(225);
    expect(s3.weight_lb).toBeLessThan(s2.weight_lb);
    expect(s2.target_reps).toBe(7); // +2
    expect(s3.target_reps).toBe(9); // +2 again
  });

  it('drops compound, so the pyramid keeps descending', () => {
    const weights = [0, 1, 2, 3].map((i) => setAt(i).weight_lb);
    for (let i = 1; i < weights.length; i++) expect(weights[i]!).toBeLessThan(weights[i - 1]!);
  });

  it('honours a custom drop and rep step', () => {
    const gentle: SetScheme = { kind: 'reverse_pyramid', dropPct: 5, repStep: 1 };
    const steep: SetScheme = { kind: 'reverse_pyramid', dropPct: 20, repStep: 3 };
    expect(setAt(1, gentle).weight_lb).toBeGreaterThan(setAt(1, steep).weight_lb);
    expect(setAt(1, gentle).target_reps).toBe(6);
    expect(setAt(1, steep).target_reps).toBe(8);
  });

  it('never prescribes an unloadable weight', () => {
    for (const i of [0, 1, 2, 3, 4]) {
      expect(setAt(i).weight_lb % 2.5).toBe(0); // on the barbell grid
    }
  });

  it('snaps to the kg grid at a metric gym', () => {
    const metricUser = { ...user, plate_system: 'metric' as const };
    const s = reversePyramidSet({ topWeightLb: 100, topReps: 5, setIndex: 1, scheme: rpt, exercise: { ...bar, equipment: 'machine_selectorized' }, profile: metricUser });
    expect(lbToKg(s.weight_lb) % 5).toBeCloseTo(0, 6);
  });

  it('never asks for fewer than one rep, whatever the input', () => {
    expect(setAt(0, rpt, 225, 0).target_reps).toBeGreaterThanOrEqual(1);
  });

  it('describes the whole ladder for the UI', () => {
    const text = describePyramid({
      topWeightLb: 225, topReps: 5, sets: 3, scheme: rpt,
      exercise: bar, profile: user, format: (lb) => `${lb}`,
    });
    expect(text).toMatch(/^225 × 5, [\d.]+ × 7, [\d.]+ × 9$/);
  });
});
