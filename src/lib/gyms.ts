// Multi-gym support (MULTI_GYM.md). Two rules, and the scope of each matters more
// than the mechanism:
//
//   Rule 1 — Equipment settings are per-GYM. Increments, stack minimums, micro
//            plates, dumbbell increments, and the plate system belong to a
//            building, not a person.
//
//   Rule 2 — MACHINE history is per-gym. Barbell and dumbbell history is NOT.
//            225 lb is 225 lb anywhere and a 45 lb bar is a 45 lb bar, so splitting
//            those would fragment the highest-quality data for no benefit. Machines
//            differ in leverage and carriage weight, so only they separate.
//
// Everything person-level — volume, RIR calibration, readiness, ACWR, fatigue,
// block state, the weekly summary — deliberately stays global. A set trains a
// muscle regardless of which building you were standing in.

import type { Equipment } from './types';
import type { PlateSystem } from './units';

/** Equipment whose logged numbers mean different things at different gyms. */
const GYM_SCOPED_EQUIPMENT: ReadonlySet<Equipment> = new Set<Equipment>([
  'machine_selectorized',
  'machine_plate',
  'cable',
]);

/** Whether this exercise's HISTORY separates by gym. Machines/cables: yes.
 *  Barbell, dumbbell, bodyweight, kettlebell, band: no — universal. */
export function isGymScopedEquipment(equipment: Equipment): boolean {
  return GYM_SCOPED_EQUIPMENT.has(equipment);
}

/** The current gym context threaded into the engine. Null/absent = no gym scoping
 *  (single-gym users and every pre-gym caller behave exactly as before). */
export interface GymScope {
  gymId: string | null;
  homeGymId: string | null;
}

interface ScopableSession {
  exercise_id: string;
  /** Null on legacy rows logged before gyms existed — treated as the home gym. */
  gym_id?: string | null;
}

/**
 * Scope ONE exercise's history to the current gym, leaving every other exercise's
 * sessions untouched.
 *
 * Only this exercise's rows are filtered, so the caller can still compute
 * person-level context (ACWR, fatigue) from the full set. For non-machine
 * equipment this is the identity function — barbell history is never split.
 *
 * `null`/absent gym_id is legacy data and always counts as the home gym.
 */
export function scopeHistoryToGym<T extends ScopableSession>(
  sessions: T[],
  ex: { id: string; equipment: Equipment },
  gymId: string | null,
  homeGymId: string | null = null,
): T[] {
  if (!isGymScopedEquipment(ex.equipment) || gymId === null) return sessions;
  const atHome = homeGymId !== null && gymId === homeGymId;
  return sessions.filter((s) => {
    if (s.exercise_id !== ex.id) return true; // other exercises pass through
    const sessionGym = s.gym_id ?? (atHome ? gymId : null); // legacy → home
    return sessionGym === gymId;
  });
}

/** A gym's equipment profile — shape-compatible with the rounding layer's
 *  IncProfile, so snapToLoadable needs no signature change: the caller merges
 *  these over the user profile and rounding resolves the CURRENT gym's grid. */
export interface GymEquipment {
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
  plate_system: PlateSystem;
}

/** Merge a gym's equipment settings over the user's, so every rounding call
 *  (recommendation, warm-up, live progression) uses this building's grid. */
export function effectiveEquipment<T extends GymEquipment>(profile: T, gym: Partial<GymEquipment> | null): T {
  if (!gym) return profile;
  return {
    ...profile,
    has_micro_plates: gym.has_micro_plates ?? profile.has_micro_plates,
    dumbbell_increment_lb: gym.dumbbell_increment_lb ?? profile.dumbbell_increment_lb,
    plate_system: gym.plate_system ?? profile.plate_system,
  };
}

/** Days a non-home selection may sit before we quietly confirm it (MULTI_GYM.md). */
export const STALE_GYM_DAYS = 3;

/**
 * Whether to show ONE quiet confirmation of the selected gym. Catches the real
 * failure mode — coming home and forgetting to switch back — without nagging:
 * only when the selection is non-home AND it was last used more than N days ago.
 * At the home gym this never fires.
 */
export function shouldConfirmGym(
  selectedGymId: string | null,
  homeGymId: string | null,
  lastUsedAtMs: number | null,
  nowMs: number,
  days = STALE_GYM_DAYS,
): boolean {
  if (selectedGymId === null || selectedGymId === homeGymId) return false;
  if (lastUsedAtMs === null) return false;
  return nowMs - lastUsedAtMs > days * 86_400_000;
}
