import { describe, expect, it } from 'vitest';
import { duplicateName, lineupFromSession, moveItem, structuralDiff } from './workoutTemplates';

const TPL = ['squat', 'bench', 'row'];

describe('structural diff — the ONLY trigger for the update prompt (SAVED_WORKOUTS.md)', () => {
  it('an identical lineup is not a change', () => {
    expect(structuralDiff(TPL, ['squat', 'bench', 'row']).changed).toBe(false);
  });

  it('detects an added exercise', () => {
    const d = structuralDiff(TPL, ['squat', 'bench', 'row', 'curl']);
    expect(d.added).toEqual(['curl']);
    expect(d.removed).toEqual([]);
    expect(d.changed).toBe(true);
  });

  it('detects a skipped (removed) exercise', () => {
    const d = structuralDiff(TPL, ['squat', 'bench']);
    expect(d.removed).toEqual(['row']);
    expect(d.added).toEqual([]);
    expect(d.changed).toBe(true);
  });

  it('detects a reorder of the same exercises', () => {
    const d = structuralDiff(TPL, ['bench', 'squat', 'row']);
    expect(d.reordered).toBe(true);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
    expect(d.changed).toBe(true);
  });

  it('does not call it a reorder when the sets differ (add/remove already says it)', () => {
    const d = structuralDiff(TPL, ['row', 'bench']); // removed squat AND different order
    expect(d.removed).toEqual(['squat']);
    expect(d.reordered).toBe(false);
  });

  it('training an exercise twice is not a structural change', () => {
    expect(structuralDiff(TPL, ['squat', 'bench', 'row', 'squat']).changed).toBe(false);
  });

  // The guarantee: this function takes exercise IDs only, so set counts, weights,
  // reps, skipped sets, and failed sets are structurally invisible to it.
  it('cannot fire on sets/weights/reps — same lineup, wildly different work', () => {
    // Session A: 3 sets each. Session B: 1 set, missed reps, lighter. Same lineup.
    const sessionA = ['squat', 'squat', 'squat', 'bench', 'bench', 'row'];
    const sessionB = ['squat', 'bench', 'row'];
    expect(structuralDiff(TPL, sessionA).changed).toBe(false);
    expect(structuralDiff(TPL, sessionB).changed).toBe(false);
  });
});

describe('template editing helpers', () => {
  it('lineupFromSession takes exactly what was trained, in order, deduped', () => {
    expect(lineupFromSession(['squat', 'squat', 'curl', 'bench'])).toEqual(['squat', 'curl', 'bench']);
  });

  it('moveItem reorders without mutating the original', () => {
    const list = ['a', 'b', 'c'];
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(list, 2, 0)).toEqual(['c', 'a', 'b']);
    expect(list).toEqual(['a', 'b', 'c']); // untouched
    expect(moveItem(list, 0, 9)).toEqual(list); // out of range → unchanged copy
  });

  it('duplicateName avoids collisions', () => {
    expect(duplicateName('Push A', [])).toBe('Push A copy');
    expect(duplicateName('Push A', ['Push A copy'])).toBe('Push A copy 2');
    expect(duplicateName('Push A', ['Push A copy', 'Push A copy 2'])).toBe('Push A copy 3');
  });
});
