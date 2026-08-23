import { describe, expect, it } from 'vitest';
import { repRangeForGoal } from './progression';
import { formatDuration, formatRest, nextSetTarget, type LiveExercise, type LiveProfile } from './liveProgression';

const barbell: LiveExercise = { equipment: 'barbell', load_type: 'total', default_increment_lb: 5, is_compound: true };
const curl: LiveExercise = { equipment: 'dumbbell', load_type: 'per_hand', default_increment_lb: 5, is_compound: false };
const micro: LiveProfile = { has_micro_plates: true, dumbbell_increment_lb: 5 };

const call = (currentWeight: number, targetReps: number, last: { reps: number; rir: number; failed?: boolean }, ex = barbell) =>
  nextSetTarget({ currentWeight, targetReps, last, exercise: ex, profile: micro });

describe('nextSetTarget', () => {
  it('holds on an on-target set', () => {
    const n = call(225, 5, { reps: 5, rir: 2 });
    expect(n.weight_lb).toBe(225);
    expect(n.note).toMatch(/on track/i);
  });

  it('nudges up one increment when beaten with reps to spare', () => {
    const n = call(225, 5, { reps: 7, rir: 3 });
    expect(n.weight_lb).toBe(227.5); // +2.5 (barbell w/ micro plates)
    expect(n.note).toMatch(/up one increment/i);
  });

  it('backs off one increment on a clear miss', () => {
    const n = call(225, 5, { reps: 3, rir: 0 });
    expect(n.weight_lb).toBe(222.5);
    expect(n.note).toMatch(/backing off/i);
  });

  it('backs off when the set failed', () => {
    expect(call(225, 5, { reps: 5, rir: 0, failed: true }).weight_lb).toBe(222.5);
  });

  it('holds (does not back off) one rep short', () => {
    // reps === targetReps - 1 is not a "clear" miss.
    const n = call(225, 5, { reps: 4, rir: 1 });
    expect(n.weight_lb).toBe(225);
  });

  it('holds and rests longer when ground out to failure at target', () => {
    const n = call(225, 5, { reps: 5, rir: 0 });
    expect(n.weight_lb).toBe(225);
    expect(n.note).toMatch(/hold/i);
    expect(n.rest_seconds).toBe(180);
  });
});

describe('rest timer', () => {
  it('scales with effort and is shorter for isolation', () => {
    expect(call(225, 5, { reps: 5, rir: 1 }).rest_seconds).toBe(180); // hard compound
    expect(call(225, 5, { reps: 5, rir: 3 }).rest_seconds).toBe(120);
    expect(call(225, 5, { reps: 5, rir: 5 }).rest_seconds).toBe(90);
    expect(call(40, 12, { reps: 12, rir: 1 }, curl).rest_seconds).toBe(135); // isolation: 180-45
  });

  it('formatRest renders m:ss', () => {
    expect(formatRest(180)).toBe('3:00');
    expect(formatRest(90)).toBe('1:30');
    expect(formatRest(45)).toBe('0:45');
  });
});

describe('formatDuration', () => {
  it('renders M:SS under an hour and H:MM:SS past it', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600)).toBe('10:00');
    expect(formatDuration(3661)).toBe('1:01:01');
  });
});

// Double progression, applied within the session: when the load goes up you drop
// back to the bottom of the rep range; when it comes down you chase the top.
describe('the rep target follows the load (double progression)', () => {
  const range = (compound: boolean) => repRangeForGoal('hypertrophy', compound);
  const ex = { equipment: 'barbell' as const, load_type: 'total' as const, default_increment_lb: 5, is_compound: true };
  const user = { has_micro_plates: true, dumbbell_increment_lb: 5, goal: 'hypertrophy' as const };

  const at = (last: { reps: number; rir: number; failed?: boolean }, targetReps: number) =>
    nextSetTarget({ currentWeight: 225, targetReps, last, exercise: ex, profile: user });

  it('adding weight resets the reps to the bottom of the range', () => {
    const top = range(true).max;
    const next = at({ reps: top + 1, rir: 3 }, top); // beat it with room to spare
    expect(next.weight_lb).toBeGreaterThan(225); // load went up…
    expect(next.target_reps).toBe(range(true).min); // …so reps reset to the bottom
  });

  it('backing off the weight chases the top of the range', () => {
    const next = at({ reps: 3, rir: 0, failed: true }, range(true).min);
    expect(next.weight_lb).toBeLessThan(225); // load came down…
    expect(next.target_reps).toBe(range(true).max); // …so there are reps to chase
  });

  it('holding the weight holds the rep target', () => {
    expect(at({ reps: 10, rir: 2 }, 10).target_reps).toBe(10);
    expect(at({ reps: 10, rir: 0 }, 10).target_reps).toBe(10); // ground it out
  });

  it('without a goal it behaves exactly as before — reps never move', () => {
    const noGoal = { has_micro_plates: true, dumbbell_increment_lb: 5 };
    const next = nextSetTarget({
      currentWeight: 225, targetReps: 8,
      last: { reps: 12, rir: 3 }, exercise: ex, profile: noGoal,
    });
    expect(next.weight_lb).toBeGreaterThan(225);
    expect(next.target_reps).toBe(8); // unchanged
  });
});
