import { describe, expect, it } from 'vitest';
import { AnsweredEntries, isBigJump, isImplausible, JUMP_MIN_SETS } from './entryCheck';

describe('a typed weight is never altered or questioned for loadability', () => {
  it('exposes no grid/snapping check for user input at all', async () => {
    const mod = await import('./entryCheck');
    // The app snaps its OWN recommendations, but never second-guesses what the user
    // types — that was friction on every set for a problem they don't have.
    expect('checkLoadable' in mod).toBe(false);
  });
});

describe('re-entering the same number does not ask twice', () => {
  it('remembers answered (exercise, weight) pairs for the session', () => {
    const answered = new AnsweredEntries();
    expect(answered.has('squat', 405)).toBe(false);
    answered.record('squat', 405);
    expect(answered.has('squat', 405)).toBe(true);
    expect(answered.has('squat', 415)).toBe(false); // a different number is fresh
    expect(answered.has('bench', 405)).toBe(false); // as is a different lift
  });
});

// FIXES_ENTRY.md bug 2 — the jump check was judging against an n=1 baseline.
describe('plausibility needs enough history to judge (bug 2)', () => {
  it('never fires below the threshold, at any magnitude within plausible range', () => {
    for (const sets of [0, 1, 2]) {
      expect(isBigJump(400, 100, sets)).toBe(false); // 4x — still no basis to judge
      expect(isBigJump(20, 100, sets)).toBe(false);
    }
  });

  it('activates at 3+ working sets and behaves as originally specced', () => {
    expect(isBigJump(400, 100, JUMP_MIN_SETS)).toBe(true); // >2x
    expect(isBigJump(20, 100, JUMP_MIN_SETS)).toBe(true); // <0.5x
    expect(isBigJump(110, 100, JUMP_MIN_SETS)).toBe(false); // normal progression
  });

  it('is inert without a usable reference', () => {
    expect(isBigJump(400, 0, 10)).toBe(false);
  });
});

describe('the absolute guard is history-independent (bug 2)', () => {
  it('catches an implausible value even on set one', () => {
    expect(isImplausible(2250, 'dumbbell')).toBe(true); // four-digit dumbbell
    expect(isImplausible(5000, 'barbell')).toBe(true);
    // …while the relative check correctly stays silent at n=0.
    expect(isBigJump(2250, 60, 0)).toBe(false);
  });

  it('leaves real (even heavy) lifts alone', () => {
    expect(isImplausible(700, 'barbell')).toBe(false);
    expect(isImplausible(120, 'dumbbell')).toBe(false);
    expect(isImplausible(400, 'machine_plate')).toBe(false);
  });

  it('rejects negatives and junk', () => {
    expect(isImplausible(-5, 'barbell')).toBe(true);
    expect(isImplausible(NaN, 'barbell')).toBe(true);
  });
});
