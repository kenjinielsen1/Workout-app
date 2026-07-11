import { describe, expect, it } from 'vitest';
import {
  formatPlateChip,
  groupPlates,
  plateLoadout,
  plateDenominations,
} from './plateMath';
import type { Equipment, LoadType } from './types';

const micro = { has_micro_plates: true };
const noMicro = { has_micro_plates: false };
const bb = (): { equipment: Equipment; load_type: LoadType } => ({
  equipment: 'barbell',
  load_type: 'total',
});
const machine = (): { equipment: Equipment; load_type: LoadType } => ({
  equipment: 'machine_plate',
  load_type: 'per_side',
});

describe('barbell loadout', () => {
  it('225 = bar + 45 + 45 per side', () => {
    const r = plateLoadout(225, bb(), micro)!;
    expect(r.perSide).toEqual([45, 45]);
    expect(r.loadable).toBe(true);
    expect(r.achievedWeightLb).toBe(225);
    expect(formatPlateChip(r)).toBe('bar + 45 + 45 per side');
  });

  it('135 = bar + 45 per side', () => {
    expect(plateLoadout(135, bb(), micro)!.perSide).toEqual([45]);
  });

  it('greedy is minimal-plate: 185 = 45 + 25', () => {
    expect(plateLoadout(185, bb(), micro)!.perSide).toEqual([45, 25]);
  });

  it('100 = 25 + 2.5 per side', () => {
    const r = plateLoadout(100, bb(), micro)!;
    expect(r.perSide).toEqual([25, 2.5]);
    expect(r.achievedWeightLb).toBe(100);
  });

  it('empty bar at 45 loads nothing', () => {
    const r = plateLoadout(45, bb(), micro)!;
    expect(r.perSide).toEqual([]);
    expect(r.loadable).toBe(true);
    expect(formatPlateChip(r)).toBe('empty bar (45 lb)');
  });

  it('uses a 1.25 micro plate for a 2.5 lb bump when available', () => {
    const r = plateLoadout(47.5, bb(), micro)!;
    expect(r.perSide).toEqual([1.25]);
    expect(r.loadable).toBe(true);
  });

  it('same 47.5 is NOT loadable without micro plates', () => {
    const r = plateLoadout(47.5, bb(), noMicro)!;
    expect(r.loadable).toBe(false);
    expect(r.remainderLb).toBeCloseTo(2.5, 4); // 1.25/side short, both sides
  });

  it('50 = one 2.5 per side, loadable without micro', () => {
    expect(plateLoadout(50, bb(), noMicro)!.perSide).toEqual([2.5]);
  });

  it('below the bar is not loadable', () => {
    const r = plateLoadout(30, bb(), micro)!;
    expect(r.loadable).toBe(false);
    expect(r.perSide).toEqual([]);
  });
});

describe('machine_plate loadout', () => {
  it('reads the logged weight as per-side plates (no bar)', () => {
    const r = plateLoadout(90, machine(), micro)!;
    expect(r.barWeightLb).toBe(0);
    expect(r.perSide).toEqual([45, 45]);
    expect(formatPlateChip(r)).toBe('45 + 45 per side');
  });
});

describe('non-plate equipment', () => {
  it('returns null for dumbbells, machines, cables, bodyweight', () => {
    const kinds: Equipment[] = [
      'dumbbell',
      'machine_selectorized',
      'cable',
      'bodyweight',
      'kettlebell',
      'band',
    ];
    for (const equipment of kinds) {
      expect(plateLoadout(100, { equipment, load_type: 'total' }, micro)).toBeNull();
    }
  });
});

describe('helpers', () => {
  it('groupPlates collapses runs into counts', () => {
    expect(groupPlates([45, 45, 25, 10, 10, 10])).toEqual([
      { plate: 45, count: 2 },
      { plate: 25, count: 1 },
      { plate: 10, count: 3 },
    ]);
  });

  it('plateDenominations gates the micro plate', () => {
    expect(plateDenominations(true)).toContain(1.25);
    expect(plateDenominations(false)).not.toContain(1.25);
  });

  it('every multiple of 5 from 45 to 500 is loadable on a bare barbell', () => {
    for (let w = 45; w <= 500; w += 5) {
      expect(plateLoadout(w, bb(), noMicro)!.loadable).toBe(true);
    }
  });

  it('every multiple of 2.5 from 45 to 500 is loadable with micro plates', () => {
    for (let w = 45; w <= 500; w += 2.5) {
      expect(plateLoadout(w, bb(), micro)!.loadable).toBe(true);
    }
  });
});
