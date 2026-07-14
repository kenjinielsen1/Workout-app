import { describe, expect, it } from 'vitest';
import {
  activeObservations,
  balanceObservations,
  patternVolume,
  shouldSurface,
  type BalanceObservation,
} from './balance';
import type { MovementPattern } from './types';
import type { VolExercise, VolSession } from './volume';

const experienced = { training_age_months: 36 };
const catalog = [
  { id: 'row', name: 'Barbell Row', movement_pattern: 'horizontal_pull' as MovementPattern },
  { id: 'pullup', name: 'Pull-Up', movement_pattern: 'vertical_pull' as MovementPattern },
  { id: 'rdl', name: 'Romanian Deadlift', movement_pattern: 'hinge' as MovementPattern },
];

const vol = (entries: [MovementPattern, number][]) => new Map<MovementPattern, number>(entries);

describe('patternVolume (reads the same hard-set counting as VOLUME.md)', () => {
  it('sums hard sets per movement pattern within the window, sharing isHardSet', () => {
    const index = new Map<string, VolExercise & { movement_pattern: MovementPattern }>([
      ['bench', { primary_muscles: ['pectorals'], secondary_muscles: [], movement_pattern: 'horizontal_push' }],
      ['row', { primary_muscles: ['lats'], secondary_muscles: [], movement_pattern: 'horizontal_pull' }],
    ]);
    const sessions: VolSession[] = [
      { exercise_id: 'bench', performed_at: '2026-07-10T00:00:00Z', sets: [{ reps: 8, rir: 1 }, { reps: 8, rir: 1 }, { reps: 8, rir: 1, is_warmup: true }] },
      { exercise_id: 'row', performed_at: '2026-07-10T00:00:00Z', sets: [{ reps: 10, rir: 1 }] },
      { exercise_id: 'bench', performed_at: '2026-05-01T00:00:00Z', sets: [{ reps: 8, rir: 1 }] }, // outside 28d window
    ];
    const pv = patternVolume(sessions, index, experienced, 'hypertrophy', '2026-07-12T00:00:00Z');
    expect(pv.get('horizontal_push')).toBe(2); // warm-up excluded, old session outside window
    expect(pv.get('horizontal_pull')).toBe(1);
  });
});

describe('balance observations (PROGRAMMING.md Part B)', () => {
  it('surfaces exactly one observation for a sustained push:pull imbalance', () => {
    // 12 push : 3 pull → 4:1. Anterior/posterior balanced, nothing neglected.
    const pv = vol([
      ['horizontal_push', 8], ['vertical_push', 4], ['horizontal_pull', 2], ['vertical_pull', 1],
      ['squat', 8], ['hinge', 8],
    ]);
    const obs = balanceObservations(pv, catalog);
    expect(obs).toHaveLength(1);
    expect(obs[0]!.type).toBe('push_pull');
    expect(obs[0]!.underPattern).toBe('vertical_pull'); // the smaller pull plane
  });

  it('suggests a real catalog exercise of the under-trained pattern', () => {
    const pv = vol([['horizontal_push', 12], ['horizontal_pull', 2], ['vertical_pull', 3], ['squat', 8], ['hinge', 8]]);
    const [obs] = balanceObservations(pv, catalog);
    expect(obs!.suggestion).toEqual({ id: 'row', name: 'Barbell Row' }); // horizontal_pull fix from the catalog
  });

  it('detects a neglected pattern (zero while others are high)', () => {
    // Everything present and balanced except hinge at zero.
    const pv = vol([
      ['horizontal_push', 9], ['horizontal_pull', 8], ['vertical_push', 8], ['vertical_pull', 8], ['squat', 9], ['hinge', 0],
    ]);
    const obs = balanceObservations(pv, catalog);
    const neglected = obs.find((o) => o.type === 'neglected' || o.underPattern === 'hinge');
    expect(neglected).toBeTruthy();
    expect(neglected!.underPattern).toBe('hinge');
    expect(neglected!.suggestion).toEqual({ id: 'rdl', name: 'Romanian Deadlift' });
  });

  it('stays quiet when patterns are balanced', () => {
    const pv = vol([['horizontal_push', 8], ['horizontal_pull', 8], ['vertical_push', 6], ['vertical_pull', 6], ['squat', 8], ['hinge', 8]]);
    expect(balanceObservations(pv, catalog)).toHaveLength(0);
  });
});

describe('dismiss as intentional (suppress until it worsens)', () => {
  const obs: BalanceObservation = { type: 'push_pull', key: 'push_pull', message: '', underPattern: 'vertical_pull', severity: 4 };

  it('a dismissed flag stays hidden until it worsens materially', () => {
    const dismissedAt4 = { push_pull: { severity: 4 } };
    expect(activeObservations([obs], dismissedAt4)).toHaveLength(0); // same level → stay quiet
    const worse = { ...obs, severity: 6 }; // 4 → 6 is past the 1.25× worsen bar
    expect(activeObservations([worse], dismissedAt4)).toHaveLength(1);
  });

  it('shouldSurface: undismissed always shows; dismissed shows only if worse', () => {
    expect(shouldSurface(obs, undefined)).toBe(true);
    expect(shouldSurface(obs, { severity: 4 })).toBe(false);
    expect(shouldSurface({ ...obs, severity: 5.1 }, { severity: 4 })).toBe(true);
  });
});
