// Plate-math helper — "225 lb = bar + 45 + 45 per side".
//
// Pure and testable. Turns a logged weight into the plates to hang on each side.
// Barbells are always 45 lb (project invariant); plate-loaded machines carry the
// logged weight per side with no standard bar. Everything else (dumbbells,
// selectorized stacks, cables, bodyweight) has no plate chip.

import { BAR_WEIGHT_LB } from './constants';
import type { Equipment, LoadType } from './types';

/** Per-side plate denominations, largest first. A pair (one per side) of the
 *  smallest base plate (2.5) is a 5 lb jump; the micro (1.25) pair is a 2.5 lb
 *  jump — which is exactly why has_micro_plates gates the 2.5 grid. */
export const BASE_PLATES_LB = [45, 35, 25, 10, 5, 2.5] as const;
export const MICRO_PLATE_LB = 1.25;

export interface PlateResult {
  barWeightLb: number; // 45 for a barbell, 0 for a plate-loaded machine
  perSide: number[]; // plate denominations to load on ONE side, largest first
  achievedWeightLb: number; // what you'd actually be lifting once loaded
  targetWeightLb: number; // the logged weight we were asked to hit
  loadable: boolean; // could we hit the target exactly with these plates?
  remainderLb: number; // total shortfall if not loadable (>= 0)
}

export interface PlateGroup {
  plate: number;
  count: number; // per side
}

export function plateDenominations(hasMicroPlates: boolean): number[] {
  return hasMicroPlates ? [...BASE_PLATES_LB, MICRO_PLATE_LB] : [...BASE_PLATES_LB];
}

/** Greedy per-side decomposition. Standard plate sets are canonical, so greedy is
 *  optimal (fewest plates). Assumes an unlimited supply of each denomination. */
function decomposePerSide(
  perSideLb: number,
  denoms: number[],
): { plates: number[]; remainder: number } {
  const plates: number[] = [];
  let remaining = Number(perSideLb.toFixed(4));
  for (const d of denoms) {
    while (remaining + 1e-9 >= d) {
      plates.push(d);
      remaining = Number((remaining - d).toFixed(4));
    }
  }
  return { plates, remainder: Math.max(0, remaining) };
}

/**
 * Plate loadout for a logged weight, or `null` when the equipment isn't plate
 * loaded. `barbell` reads as a 45 lb bar plus symmetric plates; `machine_plate`
 * reads the logged weight as the per-side plate load.
 */
export function plateLoadout(
  loggedWeightLb: number,
  ex: { equipment: Equipment; load_type: LoadType },
  profile: { has_micro_plates: boolean },
): PlateResult | null {
  const denoms = plateDenominations(profile.has_micro_plates);

  if (ex.equipment === 'barbell') {
    const bar = BAR_WEIGHT_LB;
    const perSideTarget = (loggedWeightLb - bar) / 2;
    if (perSideTarget < 0) {
      // Below the empty bar — nothing to load, and only exactly-45 is "loadable".
      return {
        barWeightLb: bar,
        perSide: [],
        achievedWeightLb: bar,
        targetWeightLb: loggedWeightLb,
        loadable: Math.abs(loggedWeightLb - bar) < 1e-9,
        remainderLb: Math.max(0, loggedWeightLb - bar),
      };
    }
    const { plates, remainder } = decomposePerSide(perSideTarget, denoms);
    const achieved = bar + 2 * plates.reduce((a, b) => a + b, 0);
    return {
      barWeightLb: bar,
      perSide: plates,
      achievedWeightLb: achieved,
      targetWeightLb: loggedWeightLb,
      loadable: remainder < 1e-9,
      remainderLb: Number((remainder * 2).toFixed(4)),
    };
  }

  if (ex.equipment === 'machine_plate') {
    const { plates, remainder } = decomposePerSide(loggedWeightLb, denoms);
    const achieved = plates.reduce((a, b) => a + b, 0);
    return {
      barWeightLb: 0,
      perSide: plates,
      achievedWeightLb: achieved,
      targetWeightLb: loggedWeightLb,
      loadable: remainder < 1e-9,
      remainderLb: Number(remainder.toFixed(4)),
    };
  }

  return null;
}

/** Collapse a per-side plate list into `[{plate, count}]`, largest first. */
export function groupPlates(perSide: number[]): PlateGroup[] {
  const groups: PlateGroup[] = [];
  for (const p of perSide) {
    const last = groups[groups.length - 1];
    if (last && last.plate === p) last.count++;
    else groups.push({ plate: p, count: 1 });
  }
  return groups;
}

/** Human-readable chip text, e.g. "bar + 45 + 45 per side" or "empty bar (45 lb)". */
export function formatPlateChip(result: PlateResult): string {
  const plates = result.perSide;
  if (result.barWeightLb > 0) {
    if (plates.length === 0) return `empty bar (${result.barWeightLb} lb)`;
    return `bar + ${plates.join(' + ')} per side`;
  }
  if (plates.length === 0) return 'no plates';
  return `${plates.join(' + ')} per side`;
}
