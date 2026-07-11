import { describe, expect, it } from 'vitest';
import { snapToLoadable } from './rounding';
import {
  compositeReadiness,
  correctedRIR,
  readinessSignals,
  recommendProgression,
  repRangeForGoal,
  targetRIRForGoal,
  updateCalibrationOffset,
  type ProgContext,
  type ProgExercise,
  type ProgProfile,
  type ProgSession,
  type ProgSet,
} from './progression';

// --- builders ---------------------------------------------------------------
const bench: ProgExercise = {
  name: 'Bench Press',
  movement_pattern: 'horizontal_push',
  equipment: 'barbell',
  load_type: 'total',
  is_compound: true,
  default_increment_lb: 5,
};
const squat: ProgExercise = {
  name: 'Back Squat',
  movement_pattern: 'squat',
  equipment: 'barbell',
  load_type: 'total',
  is_compound: true,
  default_increment_lb: 10,
};
const curl: ProgExercise = {
  name: 'DB Curl',
  movement_pattern: 'isolation',
  equipment: 'dumbbell',
  load_type: 'per_hand',
  is_compound: false,
  default_increment_lb: 5,
};

const experienced: ProgProfile = {
  bodyweight_lb: 185,
  has_micro_plates: true,
  dumbbell_increment_lb: 5,
  goal: 'hypertrophy',
  training_age_months: 36,
};
const novice: ProgProfile = { ...experienced, training_age_months: 2 };

const d = (i: number) => new Date(Date.UTC(2026, 0, 1 + i * 7)).toISOString();
const nSets = (n: number, w: number, reps: number, rir: number, failed = false): ProgSet[] =>
  Array.from({ length: n }, () => ({ weight_lb: w, reps, rir, failed }));

/** A rising 4-session history that, on its own, clears the increase threshold. */
function risingHistory(
  weights: number[],
  reps: number,
  rir: number,
  target: number,
  rpes: number[],
): ProgSession[] {
  return weights.map((w, i) => ({
    performed_at: d(i),
    target_reps: target,
    session_rpe: rpes[i],
    sets: nSets(3, w, reps, rir),
  }));
}

function increaseCtx(over: Partial<ProgContext> = {}): ProgContext {
  return {
    exercise: bench,
    user: experienced,
    history: risingHistory([100, 105, 110, 115], 10, 4, 10, [8, 7.5, 7, 6.5]),
    acwr: 1.0,
    daysSinceLast: 7,
    sessionsThisExercise: 8,
    bestHistoricalE1RM: 300,
    sessionsSinceLastDeload: 4,
    previousWasFlagged: false,
    ...over,
  };
}

// --- Part 1: RIR correction -------------------------------------------------
describe('correctedRIR', () => {
  it('adds experience-scaled bias (novice ~3.5)', () => {
    expect(correctedRIR(0, novice, 8)).toBeCloseTo(3.5, 10);
  });
  it('experienced lifters get the smallest correction', () => {
    expect(correctedRIR(0, experienced, 8)).toBeCloseTo(1.2, 10);
  });
  it('penalizes high-rep reports above 12 reps', () => {
    expect(correctedRIR(0, experienced, 16)).toBeCloseTo(1.2 + 0.15 * 4, 10);
  });
  it('shrinks reports 3+ away from failure', () => {
    expect(correctedRIR(3, experienced, 8)).toBeCloseTo(3 + 1.2 + 0.5, 10);
  });
  it('subtracts the learned personal offset', () => {
    const u = { ...experienced, rir_calibration_offset: 1.0 };
    expect(correctedRIR(0, u, 8)).toBeCloseTo(1.2 - 1.0, 10);
  });
});

// --- sanity: the base context actually increases ----------------------------
describe('base readiness context', () => {
  it('emits an increase when all signals are positive', () => {
    const r = recommendProgression(increaseCtx());
    expect(r.action).toBe('increase_load');
    expect(r.readiness).toBeGreaterThanOrEqual(0.6);
    expect(r.target_weight_lb).toBe(120); // +5 (upper), reps reset to range bottom
    expect(r.target_reps).toBe(repRangeForGoal('hypertrophy', true).min);
  });
});

// --- Testing Requirement 1: no random increases at a plateau ----------------
describe('no-random-increase at a genuine plateau', () => {
  it('emits zero load increases across 500 flat, honest, normal-fatigue sessions', () => {
    // reported 0.8 -> corrected 2.0 == hypertrophy target -> s1 = 0. Flat e1RM,
    // flat RPE, ACWR in the sweet spot.
    let increases = 0;
    for (let i = 0; i < 500; i++) {
      const hist: ProgSession[] = [0, 1, 2, 3].map((k) => ({
        performed_at: d(k),
        target_reps: 8,
        session_rpe: 7,
        sets: nSets(3, 100, 8, 0.8),
      }));
      const ctx = increaseCtx({
        history: hist,
        acwr: 1.0,
        bestHistoricalE1RM: 200,
      });
      const r = recommendProgression(ctx);
      if (r.action === 'increase_load') increases++;
    }
    expect(increases).toBe(0);
  });
});

// --- Testing Requirement 2: fatigue-masking ---------------------------------
describe('fatigue-masking', () => {
  it('cuts volume instead of deloading when fitness is masked by fatigue', () => {
    // Flat/negative e1RM, elevated ACWR, rising RPE.
    const hist: ProgSession[] = [
      { performed_at: d(0), target_reps: 8, session_rpe: 6, sets: nSets(3, 115, 8, 2) },
      { performed_at: d(1), target_reps: 8, session_rpe: 7, sets: nSets(3, 115, 8, 2) },
      { performed_at: d(2), target_reps: 8, session_rpe: 8, sets: nSets(3, 115, 7, 1) },
      { performed_at: d(3), target_reps: 8, session_rpe: 9, sets: nSets(3, 115, 7, 1) },
    ];
    const r = recommendProgression(increaseCtx({ history: hist, acwr: 1.4 }));
    expect(r.action).toBe('reduce_volume');
    expect(r.target_sets).toBe(2);
    expect(r.target_weight_lb).toBe(115);
  });
});

// --- Testing Requirement 3: novice bias -------------------------------------
describe('novice bias', () => {
  it('does not treat a novice reporting rir 0 as at failure (corrected ~3.5)', () => {
    expect(correctedRIR(0, novice, 8)).toBeCloseTo(3.5, 10);
  });
  it('still emits increases for a progressing novice', () => {
    const hist = risingHistory([95, 100, 105, 110], 10, 0, 10, [8, 7.5, 7, 6.5]);
    const r = recommendProgression(increaseCtx({ user: novice, history: hist }));
    expect(r.action).toBe('increase_load');
  });
});

// --- Testing Requirement 4: veto coverage (nine vetoes) ---------------------
describe('hard vetoes — each blocks/bounds an otherwise-increasing state', () => {
  it('#1 ACWR > 1.5', () => {
    const r = recommendProgression(increaseCtx({ acwr: 1.6 }));
    expect(r.action).not.toBe('increase_load');
    expect(r.vetoes.join()).toMatch(/ACWR/);
  });

  it('#2 fewer than 3 sessions', () => {
    const r = recommendProgression(increaseCtx({ sessionsThisExercise: 2 }));
    expect(r.action).not.toBe('increase_load');
    expect(r.vetoes.join()).toMatch(/3 sessions/);
  });

  it('#3 detraining: > 14 days since last session', () => {
    const r = recommendProgression(increaseCtx({ daysSinceLast: 20 }));
    expect(r.action).not.toBe('increase_load');
    expect(r.vetoes.join()).toMatch(/detraining/);
  });

  it('#4 a set was logged to failure', () => {
    const hist = risingHistory([100, 105, 110, 115], 10, 4, 10, [8, 7.5, 7, 6.5]);
    // failed flag on a middle set (reps still met, but graded a failure)
    hist[3]!.sets = [
      { weight_lb: 115, reps: 10, rir: 4 },
      { weight_lb: 115, reps: 10, rir: 4, failed: true },
      { weight_lb: 115, reps: 10, rir: 4 },
    ];
    const r = recommendProgression(increaseCtx({ history: hist }));
    expect(r.action).not.toBe('increase_load');
    expect(r.vetoes.join()).toMatch(/failure/);
  });

  it('#5 final working set at the load ceiling (corrected RIR < 0.5)', () => {
    const u = { ...experienced, rir_calibration_offset: 2.0 };
    const hist = risingHistory([100, 105, 110, 115], 10, 4, 10, [8, 7.5, 7, 6.5]);
    // Heavy top sets fresh; light back-off taken to failure last.
    hist[3]!.sets = [
      { weight_lb: 115, reps: 10, rir: 4 },
      { weight_lb: 115, reps: 10, rir: 4 },
      { weight_lb: 80, reps: 12, rir: 0 }, // corrected = 0 + 1.2 - 2.0 < 0.5
    ];
    const r = recommendProgression(increaseCtx({ user: u, history: hist }));
    expect(r.action).not.toBe('increase_load');
    expect(r.vetoes.join()).toMatch(/ceiling/);
  });

  it('#6 caps at 105% of best historical e1RM', () => {
    const r = recommendProgression(increaseCtx({ bestHistoricalE1RM: 120 }));
    expect(r.action).not.toBe('increase_load');
    expect(r.vetoes.join()).toMatch(/105%/);
  });

  it('#7 pain/injury note freezes progression', () => {
    const hist = risingHistory([100, 105, 110, 115], 10, 4, 10, [8, 7.5, 7, 6.5]);
    hist[3]!.pain_note = true;
    const r = recommendProgression(increaseCtx({ history: hist }));
    expect(r.action).toBe('freeze');
    expect(r.vetoes.join()).toMatch(/pain/);
  });

  it('#8 forces a deload week after 24+ sessions', () => {
    const r = recommendProgression(increaseCtx({ sessionsSinceLastDeload: 24 }));
    expect(r.action).toBe('deload');
    expect(r.vetoes.join()).toMatch(/deload week/);
  });

  it('#9 caps the increase magnitude at the smaller of 10% and 10 lb', () => {
    // Base 50 lb, +10 lb squat increment would exceed 10% (=5 lb); expect +5.
    const hist = [42.5, 45, 47.5, 50].map((w, i) => ({
      performed_at: d(i),
      target_reps: 6,
      session_rpe: [8, 7.5, 7, 6.5][i],
      sets: nSets(3, w, 6, 6),
    }));
    const r = recommendProgression(
      increaseCtx({
        exercise: squat,
        user: { ...experienced, goal: 'strength' },
        history: hist,
        bestHistoricalE1RM: 300,
      }),
    );
    expect(r.action).toBe('increase_load');
    expect(r.target_weight_lb).toBe(55); // +5, not +10
  });
});

// --- Testing Requirement 5: double progression invariant --------------------
describe('double progression invariant (10k random states)', () => {
  it('never raises both load and target reps versus the prior session', () => {
    const exercises = [bench, squat, curl];
    const goals = ['strength', 'hypertrophy', 'endurance'] as const;
    let checks = 0;
    for (let i = 0; i < 10_000; i++) {
      const ex = exercises[i % exercises.length]!;
      const goal = goals[i % goals.length]!;
      const micro = Math.random() < 0.5;
      const user: ProgProfile = {
        bodyweight_lb: 180,
        has_micro_plates: micro,
        dumbbell_increment_lb: 5,
        goal,
        training_age_months: [2, 10, 30, 60][i % 4]!,
        rir_calibration_offset: Math.random() * 2,
      };
      const target = 3 + Math.floor(Math.random() * 12);
      const hist: ProgSession[] = [0, 1, 2, 3].map((k) => ({
        performed_at: d(k),
        target_reps: target,
        session_rpe: 5 + Math.random() * 4,
        sets: nSets(
          1 + Math.floor(Math.random() * 3),
          45 + Math.floor(Math.random() * 80) * 2.5,
          1 + Math.floor(Math.random() * 14),
          Math.floor(Math.random() * 5),
          Math.random() < 0.15,
        ),
      }));
      const ctx: ProgContext = {
        exercise: ex,
        user,
        history: hist,
        acwr: 0.6 + Math.random() * 1.2,
        daysSinceLast: Math.floor(Math.random() * 20),
        sessionsThisExercise: Math.floor(Math.random() * 12),
        bestHistoricalE1RM: 100 + Math.random() * 250,
        sessionsSinceLastDeload: Math.floor(Math.random() * 30),
        previousWasFlagged: Math.random() < 0.5,
      };
      const r = recommendProgression(ctx);
      const base = snapToLoadable(
        Math.max(...hist[hist.length - 1]!.sets.map((s) => s.weight_lb)),
        ex,
        user,
        'nearest',
      );
      const weightUp = r.target_weight_lb > base;
      const repsUp = r.target_reps > target;
      expect(weightUp && repsUp).toBe(false);
      // And every emitted weight is loadable.
      expect(Number((r.target_weight_lb % 2.5).toFixed(4))).toBe(0);
      checks++;
    }
    expect(checks).toBe(10_000);
  });
});

// --- Testing Requirement 6: calibration convergence -------------------------
describe('calibration convergence', () => {
  it('converges to a true +2.0 bias within 0.3 in <= 10 sets', () => {
    let offset = 0;
    for (let i = 0; i < 10; i++) offset = updateCalibrationOffset(offset, 2.0);
    expect(Math.abs(offset - 2.0)).toBeLessThanOrEqual(0.3);
  });
  it('is a proper EWMA (recent errors dominate)', () => {
    expect(updateCalibrationOffset(0, 1)).toBeCloseTo(0.3, 10);
    expect(updateCalibrationOffset(1, 1)).toBeCloseTo(1.0, 10);
  });
});

// --- signals & composite spot checks ----------------------------------------
describe('signals', () => {
  it('S1 is +1 when corrected top-set RIR is well above target', () => {
    const ctx = increaseCtx();
    const sig = readinessSignals(ctx);
    expect(sig.s1).toBe(1);
    expect(sig.s4).toBe(1); // acwr 1.0 sweet spot
  });
  it('composite uses the literature-prior weights', () => {
    expect(compositeReadiness({ s1: 1, s2: 1, s3: 1, s4: 1, s5: 1 })).toBeCloseTo(1, 10);
    expect(compositeReadiness({ s1: 1, s2: 0, s3: 0, s4: 0, s5: 0 })).toBeCloseTo(0.3, 10);
  });
  it('targetRIR reflects the goal', () => {
    expect(targetRIRForGoal('strength')).toBe(4);
    expect(targetRIRForGoal('hypertrophy')).toBe(2);
  });
});

// --- guards -----------------------------------------------------------------
describe('guards', () => {
  it('throws on empty history', () => {
    expect(() => recommendProgression(increaseCtx({ history: [] }))).toThrow();
  });
});
