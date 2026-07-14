import { describe, expect, it } from 'vitest';
import {
  chooseProgressionVariable,
  isHardSet,
  volumeAction,
  volumeLeads,
  weeklyHardSets,
  weekStartOf,
  type Recovery,
  type VolExercise,
  type VolSession,
} from './volume';
import { landmarksFor, updateMRVEstimate } from './volumeLandmarks';

const experienced = { training_age_months: 36 }; // correctedRIR bias 1.2
const bench: VolExercise = { primary_muscles: ['pectorals', 'triceps'], secondary_muscles: ['front_delts'] };
const fly: VolExercise = { primary_muscles: ['pectorals'], secondary_muscles: [] };
const index = new Map<string, VolExercise>([['bench', bench], ['fly', fly]]);

const goodRecovery: Recovery = { rpeRising: false, performanceFalling: false, acwr: 1.0 };
const decliningRecovery: Recovery = { rpeRising: true, performanceFalling: true, acwr: 1.4 };

describe('hard-set counting (VOLUME.md)', () => {
  it('counts a working set within failure proximity, excludes warm-ups and failures', () => {
    expect(isHardSet({ reps: 8, rir: 1 }, experienced, 'hypertrophy')).toBe(true);
    expect(isHardSet({ reps: 8, rir: 1, is_warmup: true }, experienced, 'hypertrophy')).toBe(false);
    expect(isHardSet({ reps: 8, rir: 0, failed: true }, experienced, 'hypertrophy')).toBe(false);
    expect(isHardSet({ reps: 0, rir: 1 }, experienced, 'hypertrophy')).toBe(false);
    // Far from failure (RIR 5 → corrected ~6.2) → not a stimulating hard set.
    expect(isHardSet({ reps: 8, rir: 5 }, experienced, 'hypertrophy')).toBe(false);
  });

  it('primary muscle = 1.0, secondary = 0.5 per set', () => {
    const week = weeklyHardSets(
      [{ exercise_id: 'bench', performed_at: '2026-07-06T10:00:00Z', sets: [
        { reps: 8, rir: 1 }, { reps: 8, rir: 1 }, { reps: 8, rir: 1 },
        { reps: 10, rir: 2, is_warmup: true }, // excluded
      ] }],
      index, experienced, 'hypertrophy',
    );
    expect(week.get('pectorals')).toBe(3); // 3 hard sets × 1.0 (primary)
    expect(week.get('triceps')).toBe(3); // primary too
    expect(week.get('front_delts')).toBe(1.5); // secondary → 3 × 0.5
  });

  it('sums across exercises and buckets by ISO week', () => {
    const sessions: VolSession[] = [
      { exercise_id: 'bench', performed_at: '2026-07-06T10:00:00Z', sets: [{ reps: 8, rir: 1 }, { reps: 8, rir: 1 }] },
      { exercise_id: 'fly', performed_at: '2026-07-09T10:00:00Z', sets: [{ reps: 12, rir: 1 }, { reps: 12, rir: 1 }] },
      { exercise_id: 'fly', performed_at: '2026-07-14T10:00:00Z', sets: [{ reps: 12, rir: 1 }] }, // next week
    ];
    const wk = weeklyHardSets(sessions, index, experienced, 'hypertrophy', weekStartOf('2026-07-06T00:00:00Z'));
    expect(wk.get('pectorals')).toBe(4); // 2 bench + 2 fly, the 3rd is next week
  });
});

describe('volume progression decision', () => {
  const chest = landmarksFor('pectorals'); // mev 9, mav 16, mrv 22

  it('below MEV + good recovery → add a set', () => {
    expect(volumeAction(6, chest, goodRecovery)).toBe('add_set');
  });

  it('approaching MRV with declining recovery → hold, never add', () => {
    expect(volumeAction(18, chest, decliningRecovery)).toBe('hold'); // 18 ≥ mav, declining
  });

  it('at/over MRV with falling performance → reduce (volume-driven stall)', () => {
    expect(volumeAction(23, chest, decliningRecovery)).toBe('reduce');
  });
});

describe('goal emphasis + one variable at a time', () => {
  const chest = landmarksFor('pectorals');

  it('hypertrophy makes volume lead; strength does not', () => {
    expect(volumeLeads('hypertrophy')).toBe(true);
    expect(volumeLeads('strength')).toBe(false);
  });

  it('never returns both load and volume — exactly one variable per muscle/week', () => {
    // Under-volume, recovered, load also ready: hypertrophy picks volume, not both.
    const hyper = chooseProgressionVariable('hypertrophy', 6, chest, goodRecovery, true);
    expect(hyper).toBe('volume');
    // Same inputs, strength goal: load leads (volume above the MV floor).
    const strong = chooseProgressionVariable('strength', 6, chest, goodRecovery, true);
    expect(strong).toBe('load');
    // Whatever the choice, it's a single variable.
    for (const v of [hyper, strong]) expect(['load', 'volume', 'none']).toContain(v);
  });

  it('strength still restores the maintenance floor when volume is very low', () => {
    expect(chooseProgressionVariable('strength', 3, chest, goodRecovery, true)).toBe('volume');
  });
});

describe('per-user MRV calibration', () => {
  it('raises the MRV estimate when performance holds at higher volume', () => {
    const raised = updateMRVEstimate(22, 24, true); // held at 24 sets
    expect(raised).toBeGreaterThan(22);
  });

  it('lowers the MRV estimate when the user stalls below it', () => {
    const lowered = updateMRVEstimate(22, 14, false); // stalled at 14
    expect(lowered).toBeLessThan(22);
  });

  it('is unchanged without a clear signal', () => {
    expect(updateMRVEstimate(22, 12, true)).toBe(22); // fine, but below the ceiling → no info
  });

  it('sustained weeks at higher volume push MRV up cumulatively', () => {
    let mrv = 22;
    for (let i = 0; i < 5; i++) mrv = updateMRVEstimate(mrv, 26, true);
    expect(mrv).toBeGreaterThan(23);
  });
});

describe('muscle-specific landmarks', () => {
  it('side delts tolerate more than the lower back', () => {
    expect(landmarksFor('side_delts').mrv).toBeGreaterThan(landmarksFor('erectors').mrv);
  });
});
