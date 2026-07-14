import { describe, expect, it } from 'vitest';
import {
  buildProgContext,
  recommendSessionTarget,
  toSessionTarget,
} from './progContext';
import { recommendProgression, type ProgProfile } from './progression';
import type { FeatureExercise, FeatureSession } from './features';

const squat: FeatureExercise = {
  id: 'squat', name: 'Barbell Back Squat', movement_pattern: 'squat', equipment: 'barbell',
  load_type: 'total', is_compound: true, is_unilateral: false, fatigue_cost: 5,
  primary_muscles: ['quadriceps', 'glutes'], default_increment_lb: 10,
};
const index = new Map([[squat.id, squat]]);
const profile: ProgProfile = {
  bodyweight_lb: 200,
  has_micro_plates: true,
  dumbbell_increment_lb: 5,
  goal: 'strength',
  training_age_months: 36,
  rir_calibration_offset: 0,
};

const d = (i: number) => new Date(Date.UTC(2026, 0, 1 + i * 7)).toISOString();
const session = (i: number, w: number, reps = 5, rir = 3): FeatureSession => ({
  exercise_id: 'squat',
  performed_at: d(i),
  session_rpe: 7,
  sets: [
    { weight_lb: w - 90, reps: 5, is_warmup: true },
    { weight_lb: w, reps, rir },
    { weight_lb: w, reps, rir },
  ],
});

describe('buildProgContext', () => {
  const sessions = [0, 1, 2, 3].map((i) => session(i, 185 + i * 5));

  it('sets pain_note from real per-set pain, freezing progression (SCOPE_SAFETY.md)', () => {
    const painful = [...sessions];
    painful[3] = { ...session(3, 200), sets: [{ weight_lb: 200, reps: 5, rir: 3, pain: 'joint_sharp' }] };
    const ctx = buildProgContext(painful, squat, index, profile);
    expect(ctx.history[ctx.history.length - 1]!.pain_note).toBe(true);
    expect(recommendProgression(ctx).action).toBe('freeze');
    // A clean session (no pain) does not freeze.
    expect(buildProgContext(sessions, squat, index, profile).history[3]!.pain_note).toBe(false);
  });

  it('assembles a context the engine can consume', () => {
    const ctx = buildProgContext(sessions, squat, index, profile);
    expect(ctx.sessionsThisExercise).toBe(4);
    expect(ctx.history).toHaveLength(4);
    expect(ctx.bestHistoricalE1RM).toBeCloseTo(200 * (1 + 5 / 30), 1); // last = 200
    expect(ctx.acwr).toBeGreaterThan(0);
    // ACWR reference is just after the last session, so days-since-last is ~0.
    expect(ctx.daysSinceLast).toBeLessThan(1);
  });

  it('reconstructs per-session target reps from the prior session top set', () => {
    const varied = [session(0, 185, 5), session(1, 190, 6), session(2, 195, 5)];
    const ctx = buildProgContext(varied, squat, index, profile);
    // session index 2's target_reps proxies to session index 1's top reps (6)
    expect(ctx.history[2]!.target_reps).toBe(6);
  });

  it('counts sessions since the last detected deload', () => {
    // A clear deload at index 3 (300 -> 250 is < 92% of the 300 running max).
    const withDeload = [session(0, 250), session(1, 280), session(2, 300), session(3, 250), session(4, 255)];
    const ctx = buildProgContext(withDeload, squat, index, profile);
    expect(ctx.sessionsSinceLastDeload).toBe(1); // one session after the index-3 deload
  });
});

describe('recommendSessionTarget', () => {
  it('produces a loadable target that matches the engine directly', () => {
    const sessions = [0, 1, 2, 3].map((i) => session(i, 185 + i * 5));
    const target = recommendSessionTarget(sessions, squat, index, profile);
    const engine = recommendProgression(buildProgContext(sessions, squat, index, profile));
    expect(target).toEqual(toSessionTarget(engine));
    expect(Number((target.target_weight_lb % 2.5).toFixed(4))).toBe(0); // on the 2.5 grid
    expect(target.target_weight_lb).toBeGreaterThanOrEqual(45); // barbell floor
  });

  it('returns a zeroed sentinel when there is no history (caller falls back)', () => {
    expect(recommendSessionTarget([], squat, index, profile)).toEqual({
      target_weight_lb: 0,
      target_reps: 0,
      target_sets: 0,
    });
  });
});
