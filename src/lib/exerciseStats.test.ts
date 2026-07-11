import { describe, expect, it } from 'vitest';
import {
  bestSetE1RM,
  e1rmSeries,
  prHistory,
  repMaxes,
  sessionTonnage,
  summarize,
  tonnageSeries,
  type StatExercise,
  type StatProfile,
  type StatSession,
} from './exerciseStats';

const barbell: StatExercise = { load_type: 'total' };
const dumbbell: StatExercise = { load_type: 'per_hand' };
const user: StatProfile = { bodyweight_lb: 185 };

const day = (n: number) => new Date(Date.UTC(2026, 0, n)).toISOString();
const s = (perf: string, sets: StatSession['sets']): StatSession => ({ performed_at: perf, sets });

describe('bestSetE1RM', () => {
  it('picks the set with the highest Epley e1RM, not the heaviest', () => {
    const session = s(day(1), [
      { weight_lb: 225, reps: 3 }, // e1RM 225*(1+3/30)=247.5
      { weight_lb: 205, reps: 8 }, // e1RM 205*(1+8/30)=259.7  <- higher
    ]);
    const best = bestSetE1RM(session, barbell, user)!;
    expect(best.weight_lb).toBe(205);
    expect(best.e1rm).toBeCloseTo(205 * (1 + 8 / 30), 4);
  });

  it('excludes warmups', () => {
    const session = s(day(1), [
      { weight_lb: 315, reps: 5, is_warmup: true },
      { weight_lb: 225, reps: 5 },
    ]);
    expect(bestSetE1RM(session, barbell, user)!.weight_lb).toBe(225);
  });

  it('returns null when there are no working sets', () => {
    expect(bestSetE1RM(s(day(1), [{ weight_lb: 45, reps: 5, is_warmup: true }]), barbell, user)).toBeNull();
  });
});

describe('tonnage', () => {
  it('sums effective load × reps over working sets', () => {
    const session = s(day(1), [
      { weight_lb: 100, reps: 5 },
      { weight_lb: 100, reps: 5 },
    ]);
    expect(sessionTonnage(session, barbell, user)).toBe(1000);
  });

  it('doubles dumbbell load via effectiveLoad (per_hand)', () => {
    const session = s(day(1), [{ weight_lb: 50, reps: 10 }]); // 100 effective × 10
    expect(sessionTonnage(session, dumbbell, user)).toBe(1000);
  });
});

describe('series ordering', () => {
  it('sorts by performed_at regardless of input order', () => {
    const series = e1rmSeries(
      [s(day(3), [{ weight_lb: 235, reps: 5 }]), s(day(1), [{ weight_lb: 225, reps: 5 }])],
      barbell,
      user,
    );
    expect(series.map((p) => p.date)).toEqual([day(1), day(3)]);
  });

  it('tonnage series aligns one point per session', () => {
    const sessions = [s(day(1), [{ weight_lb: 100, reps: 5 }]), s(day(2), [{ weight_lb: 100, reps: 6 }])];
    expect(tonnageSeries(sessions, barbell, user).map((p) => p.tonnage)).toEqual([500, 600]);
  });
});

describe('prHistory', () => {
  it('records only sessions that set a new all-time e1RM', () => {
    const sessions = [
      s(day(1), [{ weight_lb: 200, reps: 5 }]), // PR
      s(day(2), [{ weight_lb: 200, reps: 5 }]), // tie, not a PR
      s(day(3), [{ weight_lb: 190, reps: 5 }]), // lower
      s(day(4), [{ weight_lb: 210, reps: 5 }]), // PR
    ];
    const prs = prHistory(sessions, barbell, user);
    expect(prs.map((p) => p.weight_lb)).toEqual([200, 210]);
  });
});

describe('repMaxes', () => {
  it('tracks the heaviest weight at each rep count, ignoring failed sets', () => {
    const sessions = [
      s(day(1), [{ weight_lb: 225, reps: 5 }, { weight_lb: 245, reps: 3 }]),
      s(day(2), [{ weight_lb: 235, reps: 5 }, { weight_lb: 250, reps: 3, failed: true }]),
    ];
    const rm = repMaxes(sessions, barbell, user);
    expect(rm).toEqual([
      { reps: 3, weight_lb: 245, date: day(1) },
      { reps: 5, weight_lb: 235, date: day(2) },
    ]);
  });
});

describe('summarize', () => {
  it('reports current, best, change, and total tonnage', () => {
    const sessions = [
      s(day(1), [{ weight_lb: 200, reps: 5 }]), // e1RM 233.3, tonnage 1000
      s(day(2), [{ weight_lb: 220, reps: 5 }]), // e1RM 256.7, tonnage 1100
    ];
    const sum = summarize(sessions, barbell, user);
    expect(sum.sessionCount).toBe(2);
    expect(sum.currentE1RM).toBeCloseTo(220 * (1 + 5 / 30), 1);
    expect(sum.bestE1RM).toBeCloseTo(220 * (1 + 5 / 30), 1);
    expect(sum.totalTonnage).toBe(2100);
    expect(sum.e1rmChange).toBeCloseTo(256.67 / 233.33 - 1, 3);
    expect(sum.lastPerformed).toBe(day(2));
  });

  it('handles an empty history without throwing', () => {
    const sum = summarize([], barbell, user);
    expect(sum).toMatchObject({
      sessionCount: 0,
      currentE1RM: null,
      bestE1RM: null,
      e1rmChange: null,
      totalTonnage: 0,
      lastPerformed: null,
    });
  });
});
