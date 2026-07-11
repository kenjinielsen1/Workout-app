import { describe, expect, it } from 'vitest';
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
