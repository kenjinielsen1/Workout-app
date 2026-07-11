import { describe, expect, it } from 'vitest';
import { recommendTarget, sessionsForExercise } from './recommend';
import type { MLPrediction } from './blend';
import type { FeatureExercise, FeatureSession } from './features';
import type { ProgProfile } from './progression';

const bench: FeatureExercise = {
  id: 'bench', name: 'Bench Press', movement_pattern: 'horizontal_push', equipment: 'barbell',
  load_type: 'total', is_compound: true, is_unilateral: false, fatigue_cost: 4,
  primary_muscles: ['pectorals', 'triceps'], default_increment_lb: 5,
};
const index = new Map([[bench.id, bench]]);
const profile: ProgProfile = {
  bodyweight_lb: 185, has_micro_plates: true, dumbbell_increment_lb: 5,
  goal: 'strength', training_age_months: 12, rir_calibration_offset: 0,
};

const d = (i: number) => new Date(Date.UTC(2026, 0, 1 + i * 7)).toISOString();
// At the top of the strength range (6 reps), fresh RIR, rising e1RM, falling RPE
// → the engine emits a load increase, which is where ML magnitude tuning applies.
const sessions: FeatureSession[] = [185, 190, 195, 200].map((w, i) => ({
  exercise_id: 'bench',
  performed_at: d(i),
  session_rpe: [8, 7.5, 7, 6.5][i],
  sets: [
    { weight_lb: w - 90, reps: 5, is_warmup: true },
    { weight_lb: w, reps: 6, rir: 4 },
    { weight_lb: w, reps: 6, rir: 4 },
  ],
}));

describe('recommendTarget', () => {
  it('returns null when there is no history for the exercise', () => {
    expect(recommendTarget([], bench, index, profile)).toBeNull();
  });

  it('rule-only path emits the engine increase (no ML)', () => {
    const t = recommendTarget(sessions, bench, index, profile, null)!;
    expect(t.alpha).toBe(0);
    expect(t.target_weight_lb).toBe(205); // 200 + 5 (upper increment)
    expect(t.target_reps).toBe(3); // reset to bottom of strength range
  });

  it('a higher ML prediction raises the increase, bounded by the session cap', () => {
    const ml: MLPrediction = {
      predicted_e1rm: 300,
      completion_probability: 0.8,
      confidence: 0.6,
      cold_start: false,
    };
    const ruleOnly = recommendTarget(sessions, bench, index, profile, null)!;
    const blended = recommendTarget(sessions, bench, index, profile, ml)!;

    expect(blended.alpha).toBeGreaterThan(0);
    expect(blended.target_weight_lb).toBeGreaterThan(ruleOnly.target_weight_lb);
    // Session-to-session cap: 200 + min(10%, 10) = 210.
    expect(blended.target_weight_lb).toBeLessThanOrEqual(210);
    expect(Number((blended.target_weight_lb % 2.5).toFixed(4))).toBe(0);
  });

  it('sessionsForExercise counts only the matching exercise', () => {
    const mixed = [...sessions, { ...sessions[0]!, exercise_id: 'other' }];
    expect(sessionsForExercise(mixed, 'bench')).toBe(4);
  });
});
