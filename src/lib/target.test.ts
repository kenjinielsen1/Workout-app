import { describe, expect, it } from 'vitest';
import { deriveInitialTarget } from './target';

const barbell = { equipment: 'barbell' as const };
const dumbbell = { equipment: 'dumbbell' as const };

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
    const t = deriveInitialTarget(history, barbell);
    expect(t.target_weight_lb).toBe(205);
    expect(t.target_reps).toBe(5);
    expect(t.target_sets).toBe(2);
  });

  it('skips warmup-only sessions when finding the last working set', () => {
    const history = [
      { sets: [{ weight_lb: 225, reps: 3 }] },
      { sets: [{ weight_lb: 45, reps: 10, is_warmup: true }] },
    ];
    expect(deriveInitialTarget(history, barbell).target_weight_lb).toBe(225);
  });

  it('falls back to an equipment-based starting weight with no history', () => {
    expect(deriveInitialTarget([], barbell).target_weight_lb).toBe(45);
    expect(deriveInitialTarget([], dumbbell).target_weight_lb).toBe(10);
  });
});
