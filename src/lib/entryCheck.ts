// Sanity checks for a MANUALLY ENTERED weight (FIXES_ENTRY.md bug 2).
//
// Deliberately absent: any loadability/grid check on user input. The app snaps its
// OWN recommendations to the equipment grid, but a weight the user types is logged
// exactly as typed — they're standing in front of the machine, and second-guessing
// their number is friction on every single set for a problem they don't have.
//
// What remains is plausibility, and it splits in two:
//
//   Absolute  — history-independent, always on. A four-digit dumbbell is a typo on
//               set one or set one hundred.
//   Relative  — the big-jump check. Depends on HISTORY, so it stays off until
//               there's enough of it to judge with; otherwise it fires every time
//               on a new movement against an n=1 baseline.

import type { Equipment } from './types';

/** Remembers which (exercise, weight) pairs the user already confirmed, so a
 *  re-entry of the same number doesn't ask twice. Session scoped. */
export class AnsweredEntries {
  private readonly seen = new Set<string>();

  private static key(exerciseId: string, weightLb: number): string {
    return `${exerciseId}::${weightLb}`;
  }

  has(exerciseId: string, weightLb: number): boolean {
    return this.seen.has(AnsweredEntries.key(exerciseId, weightLb));
  }

  record(exerciseId: string, weightLb: number): void {
    this.seen.add(AnsweredEntries.key(exerciseId, weightLb));
  }
}

/** Logged WORKING sets required before the relative jump check may fire at all.
 *  Below this the app has no basis for calling anything anomalous. */
export const JUMP_MIN_SETS = 3;

/** Absolute ceilings per equipment (lb, as logged). Far outside any plausible human
 *  range — these catch a typo, not an ambitious set. */
const IMPLAUSIBLE_ABOVE: Partial<Record<Equipment, number>> = {
  barbell: 1200,
  dumbbell: 250, // per hand
  kettlebell: 250,
  machine_plate: 1500,
  machine_selectorized: 1500,
  cable: 1000,
  bodyweight: 500, // added load
  band: 500,
};

/**
 * History-INDEPENDENT sanity bound. Stays on always, including the very first set,
 * so suppressing the relative check never removes all protection.
 */
export function isImplausible(weightLb: number, equipment: Equipment): boolean {
  if (!Number.isFinite(weightLb) || weightLb < 0) return true;
  return weightLb > (IMPLAUSIBLE_ABOVE[equipment] ?? 1500);
}

/**
 * The relative big-jump check. Requires JUMP_MIN_SETS logged working sets before it
 * can fire — for machines the caller counts sets at the CURRENT gym only, and
 * warm-ups never count (MULTI_GYM.md / FIXES_ENTRY.md).
 */
export function isBigJump(
  weightLb: number,
  referenceLb: number,
  workingSetCount: number,
): boolean {
  if (workingSetCount < JUMP_MIN_SETS) return false; // not enough history to judge
  if (referenceLb <= 0) return false;
  return weightLb > referenceLb * 2 || weightLb < referenceLb * 0.5;
}
