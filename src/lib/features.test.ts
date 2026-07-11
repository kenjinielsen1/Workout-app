import { describe, expect, it } from 'vitest';
import {
  EQUIPMENTS,
  FEATURE_NAMES,
  MOVEMENT_PATTERNS,
  PRIMARY_MUSCLE_VOCAB,
  acwr,
  buildTrainingTable,
  extractFeatures,
  featureVectorToArray,
  metricsSeries,
  multiHot,
  oneHot,
  sessionMetrics,
  type FeatureExercise,
  type FeatureProfile,
  type FeatureSession,
} from './features';

const squat: FeatureExercise = {
  id: 'squat', name: 'Squat', movement_pattern: 'squat', equipment: 'barbell',
  load_type: 'total', is_compound: true, is_unilateral: false, fatigue_cost: 5,
  primary_muscles: ['quadriceps', 'glutes'], default_increment_lb: 10,
};
const curl: FeatureExercise = {
  id: 'curl', name: 'Curl', movement_pattern: 'isolation', equipment: 'dumbbell',
  load_type: 'per_hand', is_compound: false, is_unilateral: false, fatigue_cost: 1,
  primary_muscles: ['biceps'], default_increment_lb: 5,
};
const index = new Map([squat, curl].map((e) => [e.id, e]));
const user: FeatureProfile = { bodyweight_lb: 200, training_age_months: 36, goal: 'hypertrophy' };

const d = (i: number) => new Date(Date.UTC(2026, 0, 1 + i * 7)).toISOString();
const T = (iso: string) => new Date(iso).getTime();
const squatSession = (i: number, w: number, reps = 5, rir = 2): FeatureSession => ({
  exercise_id: 'squat',
  performed_at: d(i),
  session_rpe: 7,
  sets: [
    { weight_lb: w - 90, reps: 5, is_warmup: true },
    { weight_lb: w, reps, rir },
    { weight_lb: w, reps, rir },
  ],
});

describe('encodings', () => {
  it('one-hot marks exactly one slot', () => {
    const oh = oneHot('barbell', EQUIPMENTS);
    expect(oh.reduce((a, b) => a + b, 0)).toBe(1);
    expect(oh[0]).toBe(1);
  });
  it('multi-hot marks each present muscle', () => {
    const mh = multiHot(['quadriceps', 'glutes'], PRIMARY_MUSCLE_VOCAB);
    expect(mh.reduce((a, b) => a + b, 0)).toBe(2);
  });
});

describe('sessionMetrics', () => {
  it('computes best e1RM, tonnage, top weight and corrected RIR', () => {
    const m = sessionMetrics(squatSession(0, 200, 5, 2), squat, user)!;
    expect(m.topWeight).toBe(200);
    expect(m.e1rm).toBeCloseTo(200 * (1 + 5 / 30), 4);
    expect(m.tonnage).toBe(200 * 5 * 2); // two working sets
    expect(m.topCorrectedRir).toBeCloseTo(2 + 1.2, 4); // experienced bias
  });
});

describe('ACWR normalization', () => {
  it('reads ~1.0 at steady weekly tonnage', () => {
    const sessions = [0, 1, 2, 3].map((i) => squatSession(i, 200));
    const ref = T(d(3)) + 1;
    expect(acwr(sessions, index, user, 'squat', ref)).toBeCloseTo(1.0, 2);
  });
  it('spikes above 1 when the last week is heavier than the 4-week average', () => {
    const sessions = [squatSession(0, 100), squatSession(1, 100), squatSession(2, 100), squatSession(3, 300)];
    const ref = T(d(3)) + 1;
    expect(acwr(sessions, index, user, 'squat', ref)).toBeGreaterThan(1.3);
  });
});

describe('extractFeatures', () => {
  it('uses only sessions strictly before refT', () => {
    const sessions = [squatSession(0, 200), squatSession(1, 210), squatSession(2, 999)];
    const fv = extractFeatures(sessions, squat, index, user, T(d(2)));
    // roll3 should average the first two only (200 and 210 e1RMs), not the 999 spike
    const e = (w: number) => w * (1 + 5 / 30);
    expect(fv.e1rm_roll3).toBeCloseTo((e(200) + e(210)) / 2, 2);
  });

  it('reports a positive 4-week slope for a rising trend and correct relative strength', () => {
    const sessions = [0, 1, 2, 3].map((i) => squatSession(i, 185 + i * 10));
    const fv = extractFeatures(sessions, squat, index, user);
    expect(fv.e1rm_slope_4wk).toBeGreaterThan(0);
    expect(fv.relative_strength).toBeCloseTo((215 * (1 + 5 / 30)) / 200, 3);
    expect(fv.is_compound).toBe(1);
    expect(fv.movement_pattern_onehot[0]).toBe(1); // squat is slot 0
  });

  it('days_since_last is measured from an explicit refT', () => {
    const sessions = [squatSession(0, 200), squatSession(1, 205)];
    const ref = T(d(1)) + 3 * 86_400_000; // 3 days after the last session
    expect(extractFeatures(sessions, squat, index, user, ref).days_since_last).toBeCloseTo(3, 4);
  });
});

describe('feature vector serialization', () => {
  it('FEATURE_NAMES aligns with the flattened array length', () => {
    const fv = extractFeatures([squatSession(0, 200)], squat, index, user);
    const arr = featureVectorToArray(fv);
    expect(arr.length).toBe(FEATURE_NAMES.length);
    expect(FEATURE_NAMES.length).toBe(
      17 + MOVEMENT_PATTERNS.length + EQUIPMENTS.length + PRIMARY_MUSCLE_VOCAB.length,
    );
  });
});

describe('buildTrainingTable', () => {
  const sessions = [0, 1, 2, 3, 4, 5].map((i) => squatSession(i, 185 + i * 5));

  it('emits one row per session past the minimum prior-history threshold', () => {
    const rows = buildTrainingTable('u1', sessions, index, user);
    // 6 sessions, MIN_PRIOR_SESSIONS=3 -> rows for sessions index 3,4,5 = 3 rows
    expect(rows).toHaveLength(3);
  });

  it('labels each row with the realized e1RM of that session', () => {
    const rows = buildTrainingTable('u1', sessions, index, user);
    const first = rows[0]!;
    // session index 3 -> weight 200
    expect(first.label_e1rm).toBeCloseTo(200 * (1 + 5 / 30), 1);
    expect(first.features.length).toBe(FEATURE_NAMES.length);
    expect(first.label_completed).toBe(1);
  });

  it('is empty for an exercise with too little history', () => {
    const rows = buildTrainingTable('u1', [squatSession(0, 200), squatSession(1, 205)], index, user);
    expect(rows).toEqual([]);
  });
});

describe('metricsSeries', () => {
  it('filters to the requested exercise and sorts oldest-first', () => {
    const mixed: FeatureSession[] = [
      squatSession(2, 210),
      { exercise_id: 'curl', performed_at: d(1), session_rpe: 6, sets: [{ weight_lb: 30, reps: 10, rir: 2 }] },
      squatSession(0, 200),
    ];
    const series = metricsSeries(mixed, squat, user);
    expect(series).toHaveLength(2);
    expect(series[0]!.t).toBeLessThan(series[1]!.t);
  });
});
