import { describe, expect, it } from 'vitest';
import {
  applySafetyRails,
  blendAlpha,
  blendE1RM,
  finalizeTarget,
  type MLPrediction,
  type RailContext,
} from './blend';
import type { ProgRecommendation } from './progression';

const railBarbell: RailContext = {
  priorTopWeight: 200,
  targetReps: 5,
  bestHistoricalE1RM: 300,
  trainingAgeMonths: 12,
  acwr: 1.0,
  exercise: { equipment: 'barbell', load_type: 'total', default_increment_lb: 10 },
  profile: { bodyweight_lb: 185, has_micro_plates: true, dumbbell_increment_lb: 5 },
};

const increaseRec = (weight: number, reps = 5): ProgRecommendation => ({
  action: 'increase_load',
  target_weight_lb: weight,
  target_reps: reps,
  target_sets: 3,
  readiness: 0.7,
  signals: { s1: 1, s2: 1, s3: 1, s4: 1, s5: 0 },
  confidence: 0.6,
  vetoes: [],
  rationale: 'Increase.',
});
const ml = (e1rm: number, cold = false): MLPrediction => ({
  predicted_e1rm: e1rm,
  completion_probability: 0.8,
  confidence: 0.6,
  cold_start: cold,
});

describe('blendAlpha', () => {
  it('is min(0.8, sessions/20), and 0 during cold start', () => {
    expect(blendAlpha(10, false)).toBe(0.5);
    expect(blendAlpha(30, false)).toBe(0.8);
    expect(blendAlpha(30, true)).toBe(0);
  });
  it('is clamped by the per-user cap from the nightly job', () => {
    expect(blendAlpha(30, false, 0)).toBe(0); // ML disabled for this user
    expect(blendAlpha(30, false, 0.3)).toBe(0.3);
  });
});

describe('finalizeTarget — nightly α cap', () => {
  it('a cap of 0 forces rule-only even with a strong ML prediction', () => {
    const out = finalizeTarget({
      rule: increaseRec(210),
      ml: ml(400),
      sessionsLogged: 40,
      rail: railBarbell,
      alphaCap: 0,
    });
    expect(out.alpha).toBe(0);
    expect(out.target_weight_lb).toBe(210); // the rule target, untouched
  });
});

describe('blendE1RM', () => {
  it('weights ml and rule by alpha', () => {
    const { blended, alpha } = blendE1RM(200, 260, 10, false); // alpha 0.5
    expect(alpha).toBe(0.5);
    expect(blended).toBe(230);
  });
});

describe('finalizeTarget — structure preserved', () => {
  it('passes non-increase actions (deload) straight through, ignoring ML', () => {
    const deload: ProgRecommendation = { ...increaseRec(180), action: 'deload', rationale: 'Deload.' };
    const out = finalizeTarget({ rule: deload, ml: ml(400), sessionsLogged: 40, rail: railBarbell });
    expect(out.target_weight_lb).toBe(180);
    expect(out.alpha).toBe(0);
  });

  it('uses rule-only during cold start', () => {
    const out = finalizeTarget({ rule: increaseRec(210), ml: ml(400, true), sessionsLogged: 4, rail: railBarbell });
    expect(out.target_weight_lb).toBe(210);
    expect(out.alpha).toBe(0);
    expect(out.applied).toContain('rule-based');
  });

  it('lets a higher ML prediction raise the increase — but only up to the session cap', () => {
    // Rule says 210; ML predicts a big e1RM. Session cap = 200 + min(20,10) = 210.
    const out = finalizeTarget({ rule: increaseRec(210), ml: ml(400), sessionsLogged: 40, rail: railBarbell });
    expect(out.target_weight_lb).toBeLessThanOrEqual(210);
    expect(out.target_weight_lb).toBeGreaterThanOrEqual(200); // never below prior
    expect(out.applied).toContain('capped to +10%/10 lb over last session');
  });
});

describe('applySafetyRails', () => {
  it('105% best-e1RM cap binds (prior high enough that the session cap does not preempt it)', () => {
    // best e1RM 210 -> 105% = 220.5; at 5 reps max load ≈ 220.5/(1+5/30)=189
    const rail = { ...railBarbell, priorTopWeight: 185, bestHistoricalE1RM: 210 };
    const { load, applied } = applySafetyRails(300, rail);
    expect(load).toBeLessThan(195); // below the session cap (195) too
    expect(applied).toContain('capped at 105% of best e1RM');
  });

  it('weekly e1RM cap is 2% for experienced lifters', () => {
    const rail = { ...railBarbell, priorTopWeight: 215, trainingAgeMonths: 36, baselineWeeklyE1RM: 250, bestHistoricalE1RM: 1000 };
    const { load, applied } = applySafetyRails(500, rail);
    const impliedCap = 250 * 1.02; // e1RM ceiling
    // load implied e1RM should not exceed the cap
    expect(load * (1 + 5 / 30)).toBeLessThanOrEqual(impliedCap + 1e-6);
    expect(applied.some((a) => a.includes('weekly'))).toBe(true);
  });

  it('holds at the prior weight when ACWR is over 1.5', () => {
    const rail = { ...railBarbell, acwr: 1.6 };
    expect(applySafetyRails(260, rail).load).toBe(rail.priorTopWeight);
  });

  it('never returns below the prior top set', () => {
    expect(applySafetyRails(120, railBarbell).load).toBe(200);
  });
});

describe('order-of-operations invariant (10k random)', () => {
  it('final is loadable, on the 2.5 grid, and breaches no rail', () => {
    const equips = ['barbell', 'dumbbell', 'machine_plate'] as const;
    for (let i = 0; i < 10_000; i++) {
      const equipment = equips[i % equips.length]!;
      const micro = Math.random() < 0.5;
      // Multiples of 10 are loadable for barbell, dumbbell (5), and machine (10)
      // alike — a realistic prior is always loadable for its own equipment.
      const prior = 50 + Math.floor(Math.random() * 40) * 10;
      const best = prior * (0.9 + Math.random() * 0.5) * (1 + 5 / 30);
      const rail: RailContext = {
        priorTopWeight: prior,
        targetReps: 3 + Math.floor(Math.random() * 6),
        bestHistoricalE1RM: best,
        baselineWeeklyE1RM: Math.random() < 0.5 ? best * 0.98 : undefined,
        trainingAgeMonths: [3, 20, 40][i % 3]!,
        acwr: 0.7 + Math.random() * 1.0,
        exercise: { equipment, load_type: equipment === 'barbell' ? 'total' : equipment === 'dumbbell' ? 'per_hand' : 'per_side', default_increment_lb: 10 },
        profile: { bodyweight_lb: 180, has_micro_plates: micro, dumbbell_increment_lb: 5 },
      };
      const out = finalizeTarget({
        rule: increaseRec(prior + 5, rail.targetReps),
        ml: ml(best * (0.8 + Math.random() * 0.6)),
        sessionsLogged: Math.floor(Math.random() * 40),
        rail,
      });

      // On the 2.5 grid.
      expect(Number((out.target_weight_lb % 2.5).toFixed(4))).toBe(0);
      // Never below the prior working weight (an increase can't become a decrease).
      expect(out.target_weight_lb).toBeGreaterThanOrEqual(prior - 1e-9);
      // Session cap never breached (floor guarantees ≤ cap).
      const sessionCap = prior + Math.min(0.1 * prior, 10);
      expect(out.target_weight_lb).toBeLessThanOrEqual(sessionCap + 1e-9);
      // Barbell floor.
      if (equipment === 'barbell') expect(out.target_weight_lb).toBeGreaterThanOrEqual(45);
    }
  });
});
