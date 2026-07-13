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

type Ex = Pick<Exercise, 'equipment' | 'default_increment_lb' | 'weight_increment_lb' | 'weight_stack_min_lb'>;
const barbell: Ex = { equipment: 'barbell', default_increment_lb: 10 };
const dumbbell: Ex = { equipment: 'dumbbell', default_increment_lb: 5 };
// A selectorized stack with a real 15 lb step starting at 20 lb (INCREMENTS.md).
const machine: Ex = { equipment: 'machine_selectorized', default_increment_lb: 15, weight_increment_lb: 15, weight_stack_min_lb: 20 };

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
  it('machine uses its catalog weight_increment_lb verbatim', () => {
    expect(equipmentIncrement(machine, withMicro)).toBe(15);
  });
  it('a cable/selectorized machine with no catalog step falls back to the 10 lb default', () => {
    const guessed: Ex = { equipment: 'cable', default_increment_lb: 5 };
    expect(equipmentIncrement(guessed, withMicro)).toBe(10);
  });
  it('a non-2.5 machine step (3 lb) is respected, not forced to the 2.5 grid', () => {
    const threeLb: Ex = { equipment: 'machine_selectorized', default_increment_lb: 5, weight_increment_lb: 3 };
    expect(equipmentIncrement(threeLb, withMicro)).toBe(3);
  });
  it('plate-loaded machines stay on the 2.5 grid', () => {
    const plate: Ex = { equipment: 'machine_plate', default_increment_lb: 10 };
    expect(equipmentIncrement(plate, withMicro)).toBe(2.5);
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

describe('snapToLoadable — dumbbells and machines (INCREMENTS.md)', () => {
  it('dumbbells snap to the per-hand increment (5), not 2.5', () => {
    expect(snapToLoadable(62.4, dumbbell, withMicro)).toBe(60);
    expect(isMultipleOf(snapToLoadable(62.4, dumbbell, withMicro), 5)).toBe(true);
  });

  it('a stack of min 20 / step 15 only ever returns 20, 35, 50, 65…', () => {
    expect(snapToLoadable(19, machine, withMicro)).toBe(20); // below min → the min
    expect(snapToLoadable(20, machine, withMicro)).toBe(20);
    expect(snapToLoadable(34, machine, withMicro)).toBe(20);
    expect(snapToLoadable(35, machine, withMicro)).toBe(35);
    expect(snapToLoadable(100, machine, withMicro)).toBe(95); // 20 + 5*15
    for (const raw of [21, 47, 63, 88, 140]) {
      const w = snapToLoadable(raw, machine, withMicro);
      expect((w - 20) % 15).toBe(0);
    }
  });

  it('a 3 lb machine returns weights on the 3 lb grid, not 5', () => {
    const threeLb: Ex = { equipment: 'cable', default_increment_lb: 5, weight_increment_lb: 3, weight_stack_min_lb: 0 };
    expect(snapToLoadable(20, threeLb, withMicro)).toBe(18); // 6*3, floored from 20
    expect(isMultipleOf(snapToLoadable(20, threeLb, withMicro), 3)).toBe(true);
    expect(isMultipleOf(snapToLoadable(20, threeLb, withMicro), 5)).toBe(false);
  });

  it('floors between two steps — never rounds up', () => {
    // min 20, step 15: anything in [35,50) floors to 35.
    for (const raw of [35, 40, 49.9]) expect(snapToLoadable(raw, machine, withMicro)).toBe(35);
  });

  it('a below-minimum request returns the stack minimum, never zero', () => {
    expect(snapToLoadable(0, machine, withMicro)).toBe(20);
    expect(snapToLoadable(-50, machine, withMicro)).toBe(20);
  });
});

describe('metric plate system — barbell snaps to the 20 kg grid (UNITS.md)', () => {
  const KG = 2.2046226218;
  const metric = { ...withMicro, plate_system: 'metric' as const };
  const onKgGrid = (lb: number) => {
    const k = (lb / KG - 20) / 0.5;
    return Math.abs(k - Math.round(k)) < 1e-6 && lb / KG >= 20 - 1e-6;
  };

  it('a barbell target lands on 20 + 0.5k kg, stored in lb', () => {
    // 100.6 kg → floor to 100.5 kg → stored lb.
    const stored = snapToLoadable(100.6 * KG, barbell, metric, 'floor');
    expect(stored / KG).toBeCloseTo(100.5, 6);
    expect(onKgGrid(stored)).toBe(true);
    expect(isLoadable(stored, barbell, metric)).toBe(true);
  });

  it('every random metric-barbell target is on the kg grid, never an unloadable value', () => {
    for (let i = 0; i < 2000; i++) {
      const rawLb = Math.random() * 600;
      const stored = snapToLoadable(rawLb, barbell, metric, 'floor');
      expect(onKgGrid(stored)).toBe(true);
    }
  });

  it('the metric barbell floor is 20 kg (in lb), never below', () => {
    expect(snapToLoadable(0, barbell, metric)).toBeCloseTo(20 * KG, 6);
    expect(snapToLoadable(30, barbell, metric)).toBeCloseTo(20 * KG, 6); // 30 lb < 20 kg
    expect(snapToLoadable(-100, barbell, metric)).toBeCloseTo(20 * KG, 6);
  });

  it('leaves the imperial barbell grid unchanged (regression)', () => {
    expect(snapToLoadable(227.3, barbell, withMicro)).toBe(225); // 45 + 2.5k, unchanged
    expect(snapToLoadable(0, barbell, withMicro)).toBe(45);
  });
});

describe('rounding invariant — 10k random model outputs under a safety cap', () => {
  it('every emitted target is on its exercise grid, loadable, and never over the cap', () => {
    const threeLb: Ex = { equipment: 'cable', default_increment_lb: 5, weight_increment_lb: 3, weight_stack_min_lb: 5 };
    const plate: Ex = { equipment: 'machine_plate', default_increment_lb: 10 };
    const exercises = [barbell, dumbbell, machine, threeLb, plate];
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

      // Free-weight equipment stays on the 2.5 grid; machines on their own grid.
      if (ex.equipment === 'barbell' || ex.equipment === 'dumbbell' || ex.equipment === 'machine_plate') {
        expect(isMultipleOf(final, ROUNDING_INCREMENT_LB)).toBe(true);
      }
      // Physically selectable for this equipment/profile.
      expect(isLoadable(final, ex, user)).toBe(true);
      // Never breached the cap — the stack/bar minimum is the one allowed floor.
      const min = ex.weight_stack_min_lb ?? (ex.equipment === 'barbell' ? BAR_WEIGHT_LB : 0);
      if (final === min) {
        // the lightest selectable weight; acceptable even if cap < min.
      } else {
        expect(final).toBeLessThanOrEqual(capped + 1e-9);
      }
    }
  });
});
