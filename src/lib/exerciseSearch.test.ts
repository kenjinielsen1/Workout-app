import { describe, expect, it } from 'vitest';
import {
  findDuplicate,
  normalize,
  resolveExercise,
  searchExercises,
  similarity,
  type SearchableExercise,
} from './exerciseSearch';

const catalog: SearchableExercise[] = [
  { id: 'squat', name: 'Barbell Back Squat', aliases: ['back squat', 'bb squat', 'high bar squat', 'squat'] },
  { id: 'bench', name: 'Barbell Bench Press', aliases: ['bench press', 'bench', 'flat bench', 'bb bench'] },
  { id: 'front-squat', name: 'Barbell Front Squat', aliases: ['front squat', 'bb front squat'] },
  { id: 'deadlift', name: 'Barbell Deadlift', aliases: ['deadlift', 'dead', 'conventional deadlift'] },
];

describe('normalize', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalize('  Bench-Press!! ')).toBe('bench press');
  });
});

describe('similarity', () => {
  it('is 1 for identical normalized strings', () => {
    expect(similarity('BB Squat', 'bb squat')).toBe(1);
  });
  it('stays meaningfully high for close typos (well above unrelated terms)', () => {
    // A transposition breaks two bigrams, so Dice ~0.57 — still clearly "close".
    expect(similarity('deadlift', 'deadlfit')).toBeGreaterThan(0.55);
    expect(similarity('incline bench', 'incline bnch')).toBeGreaterThan(0.7);
  });
  it('is low for unrelated terms', () => {
    expect(similarity('squat', 'lat pulldown')).toBeLessThan(0.3);
  });
});

describe('resolveExercise', () => {
  it('resolves an alias to its canonical exercise', () => {
    expect(resolveExercise('bb squat', catalog)!.exercise.id).toBe('squat');
  });
  it('resolves the bare word "squat" to the back squat, not front squat', () => {
    expect(resolveExercise('squat', catalog)!.exercise.id).toBe('squat');
  });
  it('handles a typo', () => {
    expect(resolveExercise('benchpres', catalog)!.exercise.id).toBe('bench');
  });
  it('returns null when nothing is close', () => {
    expect(resolveExercise('kettlebell swing', catalog)).toBeNull();
  });
});

describe('searchExercises', () => {
  it('ranks the exact-ish match first', () => {
    const results = searchExercises('front squat', catalog);
    expect(results[0]!.exercise.id).toBe('front-squat');
  });
  it('returns nothing for an empty query', () => {
    expect(searchExercises('   ', catalog)).toEqual([]);
  });
});

describe('findDuplicate (anti-fragmentation on create)', () => {
  it('flags a near-identical new name', () => {
    expect(findDuplicate('Back Squat', catalog)!.exercise.id).toBe('squat');
  });
  it('allows a genuinely new movement', () => {
    expect(findDuplicate('Standing Calf Raise', catalog)).toBeNull();
  });
});
