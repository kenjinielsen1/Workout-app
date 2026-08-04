// The single boundary every MANUALLY ENTERED weight passes through
// (FIXES_ENTRY.md). snapToLoadable() was only ever applied to engine OUTPUT, so a
// typed weight went straight to the logged set without touching the increment grid
// — the app then accepted, and later recommended from, a weight the machine can't
// actually select.
//
// Two independent checks live here. They must not be conflated:
//
//   Loadability  — is this weight selectable? Depends on EQUIPMENT only, so it is
//                  always active, even on the very first set.
//   Plausibility — is this a suspicious jump? Depends on HISTORY, so it stays off
//                  until there's enough of it to judge with.
//
// Neither ever silently rewrites the number. Silently correcting a typed value
// erodes trust, and the user is standing in front of the machine — they may know
// about a micro-plate or a mislabeled stack that our equipment model doesn't.

import { equipmentIncrement, snapToLoadable } from './rounding';
import type { Equipment } from './types';

type CheckExercise = Parameters<typeof equipmentIncrement>[0] & { equipment: Equipment };
type CheckProfile = Parameters<typeof equipmentIncrement>[1];

export interface LoadabilityResult {
  /** The nearest selectable weight on this gym's grid. */
  snapped: number;
  /** The resolved step (gym override → catalog default → equipment default). */
  increment: number;
}

/**
 * Whether a typed weight sits on the current gym's grid for this exercise, and
 * what it would snap to if not. Returns null when it's already selectable — the
 * common case, which must stay completely frictionless.
 *
 * The increment resolution order is `equipmentIncrement`'s, which already reads the
 * exercise's gym-merged override first (MULTI_GYM.md).
 */
export function checkLoadable(
  weightLb: number,
  ex: CheckExercise,
  profile: CheckProfile,
): LoadabilityResult | null {
  if (!Number.isFinite(weightLb) || weightLb <= 0) return null;
  const snapped = snapToLoadable(weightLb, ex, profile, 'nearest');
  // A hair of tolerance so float noise never trips a prompt.
  if (Math.abs(snapped - weightLb) < 1e-6) return null;
  return { snapped, increment: equipmentIncrement(ex, profile) };
}

/** Remembers which (exercise, weight) pairs the user already answered for, so the
 *  fix can't become the very repeating-prompt bug it was written to kill. Session
 *  scoped: a fresh session asks again. */
export class AnsweredEntries {
  private readonly seen = new Set<string>();
  private readonly kept = new Map<string, number>();

  private static key(exerciseId: string, weightLb: number): string {
    return `${exerciseId}::${weightLb}`;
  }

  has(exerciseId: string, weightLb: number): boolean {
    return this.seen.has(AnsweredEntries.key(exerciseId, weightLb));
  }

  /** Record an answer. `kept` = the user insisted on their own number. */
  record(exerciseId: string, weightLb: number, kept: boolean): void {
    this.seen.add(AnsweredEntries.key(exerciseId, weightLb));
    if (kept) this.kept.set(exerciseId, (this.kept.get(exerciseId) ?? 0) + 1);
  }

  /** How many times the user has overruled us on this exercise. */
  keptCount(exerciseId: string): number {
    return this.kept.get(exerciseId) ?? 0;
  }
}

/** Overruling us this many times means OUR increment is wrong, not their entry —
 *  stop warning and offer the calibration prompt instead. */
export const RECALIBRATE_AFTER_KEEPS = 2;
