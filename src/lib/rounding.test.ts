import { describe, expect, it } from 'vitest';
import { BAR_WEIGHT_LB, ROUNDING_INCREMENT_LB } from './constants';
import {
  equipmentIncrement,
  floorTo,
  isLoadable,
  round,
  snapToLoadable,
} from './rounding';
import type { Exercise, Profile } from './types';

const withMicro: Profile = {
  bodyweight_lb: 180,
  has_micro_plates: true,
  dumbbell_increment_lb: 5,
};
const noMicro: Profile = { ...withMicro, has_micro_plates: false };

const barbell: Pick<Exercise, 'equipment' | 'default_increment_lb'> = {
  equipment: 'barbell',
  default_increment_lb: 10,
};
const dumbbell: Pick<Exercise, 'equipment' | 'default_increment_lb'> = {
  equipment: 'dumbbell',
  default_increment_lb: 5,
};
const machine: Pick<Exercise, 'equipment' | 'default_increment_lb'> = {
  equipment: 'machine_selectorized',
  default_increment_lb: 15,
};

const isMultipleOf = (lb: number, inc: number) =>
  Number((lb % inc).toFixed(4)) === 0;

describe('round / floorTo', () => {
  it('round goes to nearest 2.5', () => {
    expect(round(247.4)).toBe(247.5);
    expect(round(246.2)).toBe(245); // closer to 245 than 247.5
    expect(round(101.26)).toBe(102.5); // just over the 101.25 midpoint
    expect(round(101.24)).toBe(100); // just under the midpoint
  });

  it('floorTo never exceeds its input and stays on the 2.5 grid', () => {
    expect(floorTo(247.4)).toBe(247.5 - 2.5); // 245
    expect(floorTo(247.4)).toBeLessThanOrEqual(247.4);
    expect(isMultipleOf(floorTo(247.4), ROUNDING_INCREMENT_LB)).toBe(true);
  });

  it('floor, not round, is what keeps a capped value under the cap', () => {
    const cap = 247.4;
    expect(floorTo(cap)).toBeLessThanOrEqual(cap);
    expect(round(cap)).toBeGreaterThan(cap); // 247.5 > 247.4 — the bug floor avoids
  });
});

describe('equipmentIncrement', () => {
  it('barbell with micro plates moves in 2.5', () => {
    expect(equipmentIncrement(barbell, withMicro)).toBe(2.5);
  });
  it('barbell without micro plates moves in 5', () => {
    expect(equipmentIncrement(barbell, noMicro)).toBe(5);
  });
  it('dumbbell uses the profile increment', () => {
    expect(equipmentIncrement(dumbbell, withMicro)).toBe(5);
  });
  it('machine uses its stack increment', () => {
    expect(equipmentIncrement(machine, withMicro)).toBe(15);
  });
});

describe('snapToLoadable — barbell floor', () => {
  it('never emits a barbell target below 45 lb', () => {
    expect(snapToLoadable(0, barbell, withMicro)).toBe(BAR_WEIGHT_LB);
    expect(snapToLoadable(30, barbell, withMicro)).toBe(BAR_WEIGHT_LB);
    expect(snapToLoadable(44.9, barbell, withMicro)).toBe(BAR_WEIGHT_LB);
    expect(snapToLoadable(-100, barbell, noMicro)).toBe(BAR_WEIGHT_LB);
  });

  it('snaps a normal barbell target down to the grid', () => {
    expect(snapToLoadable(227.3, barbell, withMicro)).toBe(227.5 - 2.5); // 225
    expect(snapToLoadable(227.3, barbell, noMicro)).toBe(225); // 45 + 5*36
  });
});

describe('snapToLoadable — dumbbells and machines', () => {
  it('dumbbells snap to the per-hand increment (5), not 2.5', () => {
    expect(snapToLoadable(62.4, dumbbell, withMicro)).toBe(60);
    expect(isMultipleOf(snapToLoadable(62.4, dumbbell, withMicro), 5)).toBe(true);
  });

  it('selectorized machines snap to the stack increment (15)', () => {
    expect(snapToLoadable(100, machine, withMicro)).toBe(90); // floor to nearest 15
    expect(isMultipleOf(snapToLoadable(100, machine, withMicro), 15)).toBe(true);
  });
});

describe('rounding invariant — 10k random model outputs under a safety cap', () => {
  it('every emitted target is a multiple of 2.5, loadable, and never over the cap', () => {
    const exercises = [barbell, dumbbell, machine];
    const profiles = [withMicro, noMicro];

    for (let i = 0; i < 10_000; i++) {
      const raw = Math.random() * 600; // 0..600 lb of raw model output
      const ex = exercises[i % exercises.length]!;
      const user = profiles[i % profiles.length]!;

      // Simulate a safety rail capping the raw value, then the mandated order:
      // rails -> floor-snap. Flooring must not push it back over the cap.
      const cap = raw * (0.5 + Math.random() * 0.5); // some cap at or below raw
      const capped = Math.min(raw, cap);
      const final = snapToLoadable(capped, ex, user, 'floor');

      // Multiple of 2.5, always.
      expect(isMultipleOf(final, ROUNDING_INCREMENT_LB)).toBe(true);
      // Physically loadable for this equipment/profile.
      expect(isLoadable(final, ex, user)).toBe(true);
      // Never breached the cap (barbell floor is the one allowed exception:
      // an empty bar is the minimum you can physically load).
      if (ex.equipment === 'barbell' && final === BAR_WEIGHT_LB) {
        // floor of the bar; acceptable even if cap < 45.
      } else {
        expect(final).toBeLessThanOrEqual(capped + 1e-9);
      }
    }
  });
});
