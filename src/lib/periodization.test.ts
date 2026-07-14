import { describe, expect, it } from 'vitest';
import {
  blockPosition,
  CYCLE_WEEKS,
  isPlannedDeloadWeek,
  periodizationOnByDefault,
  phaseIntent,
} from './periodization';

const anchor = '2026-01-05T00:00:00Z'; // a Monday
const plusWeeks = (n: number) => new Date(Date.parse(anchor) + n * 7 * 86_400_000).toISOString();

describe('block cycle (PROGRAMMING.md Part A)', () => {
  it('runs accumulation → intensification → deload → repeat', () => {
    expect(blockPosition(anchor, plusWeeks(0)).phase).toBe('accumulation');
    expect(blockPosition(anchor, plusWeeks(2)).phase).toBe('accumulation');
    expect(blockPosition(anchor, plusWeeks(3)).phase).toBe('intensification');
    expect(blockPosition(anchor, plusWeeks(4)).phase).toBe('intensification');
    expect(blockPosition(anchor, plusWeeks(5)).phase).toBe('deload');
    expect(blockPosition(anchor, plusWeeks(6)).phase).toBe('accumulation'); // cycle repeats
    expect(CYCLE_WEEKS).toBe(6);
  });

  it('reports the week within the block and phase', () => {
    const p = blockPosition(anchor, plusWeeks(4));
    expect(p.weekInBlock).toBe(5);
    expect(p.weekInPhase).toBe(2); // 2nd week of intensification
  });

  it('phase intents: only a planned deload suppresses increases', () => {
    expect(phaseIntent('accumulation')).toMatchObject({ volume: 'build', suppressIncreases: false });
    expect(phaseIntent('intensification')).toMatchObject({ volume: 'trim', suppressIncreases: false });
    expect(phaseIntent('deload')).toMatchObject({ volume: 'reduce', suppressIncreases: true });
  });

  it('is a planned deload week only in the deload phase, and only when enabled', () => {
    expect(isPlannedDeloadWeek(anchor, plusWeeks(5), true)).toBe(true);
    expect(isPlannedDeloadWeek(anchor, plusWeeks(2), true)).toBe(false);
    expect(isPlannedDeloadWeek(anchor, plusWeeks(5), false)).toBe(false); // disabled
    expect(isPlannedDeloadWeek(null, plusWeeks(5), true)).toBe(false); // no block
  });

  it('defaults on for strength/hypertrophy, off for endurance', () => {
    expect(periodizationOnByDefault('hypertrophy')).toBe(true);
    expect(periodizationOnByDefault('strength')).toBe(true);
    expect(periodizationOnByDefault('endurance')).toBe(false);
  });
});
