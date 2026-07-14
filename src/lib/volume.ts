// Weekly volume management per muscle group (VOLUME.md). The primary hypertrophy
// lever: weekly HARD SETS per muscle landing in a productive range (MEV–MRV),
// progressed as its own autoregulated variable — never at the same time as load
// for the same muscle in the same week.

import { correctedRIR, targetRIRForGoal } from './progression';
import { volumeCounting } from './evidenceConfig';
import type { Landmarks } from './volumeLandmarks';
import type { Goal } from './types';

/** A secondary muscle gets a fraction of a set toward its weekly volume (config). */
export const SECONDARY_FRACTION = volumeCounting().secondaryFraction;
/** How close to failure a working set must be to count as a stimulating set (config). */
export const HARD_SET_RIR_MARGIN = volumeCounting().hardSetRirMargin;

export interface VolSet {
  reps: number;
  rir?: number | null;
  is_warmup?: boolean;
  failed?: boolean;
}
export interface VolSession {
  exercise_id: string;
  performed_at: string; // ISO
  sets: VolSet[];
}
export interface VolExercise {
  primary_muscles: string[];
  secondary_muscles: string[];
}
export interface VolProfile {
  training_age_months: number;
  rir_calibration_offset?: number;
}

/** A "hard set": a working (non-warm-up, non-failed) set close enough to failure
 *  to drive adaptation for the goal (per the goal's target RIR). */
export function isHardSet(set: VolSet, profile: VolProfile, goal: Goal): boolean {
  if (set.is_warmup || set.failed || set.reps <= 0) return false;
  const corrected = correctedRIR(set.rir ?? 0, profile, set.reps);
  return corrected <= targetRIRForGoal(goal) + HARD_SET_RIR_MARGIN;
}

/** Per-set muscle contribution: 1.0 to each primary, 0.5 to each secondary (a
 *  muscle listed as both counts once, as primary). */
function contribution(ex: VolExercise): Map<string, number> {
  const m = new Map<string, number>();
  for (const mu of ex.primary_muscles) m.set(mu, 1);
  for (const mu of ex.secondary_muscles) if (!m.has(mu)) m.set(mu, SECONDARY_FRACTION);
  return m;
}

const DAY = 86_400_000;

/** Monday 00:00 UTC of the week containing `iso`, as a YYYY-MM-DD string. */
export function weekStartOf(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

/**
 * Weighted weekly hard sets per muscle for the week starting `weekStart`
 * (YYYY-MM-DD). If `weekStart` is omitted, every provided session counts.
 */
export function weeklyHardSets(
  sessions: VolSession[],
  index: Map<string, VolExercise>,
  profile: VolProfile,
  goal: Goal,
  weekStart?: string,
): Map<string, number> {
  const lo = weekStart ? Date.parse(`${weekStart}T00:00:00Z`) : -Infinity;
  const hi = weekStart ? lo + 7 * DAY : Infinity;
  const totals = new Map<string, number>();

  for (const s of sessions) {
    const t = Date.parse(s.performed_at);
    if (t < lo || t >= hi) continue;
    const ex = index.get(s.exercise_id);
    if (!ex) continue;
    const contrib = contribution(ex);
    for (const set of s.sets) {
      if (!isHardSet(set, profile, goal)) continue;
      for (const [muscle, w] of contrib) totals.set(muscle, (totals.get(muscle) ?? 0) + w);
    }
  }
  return totals;
}

/** Where a muscle's weekly volume sits relative to its landmarks — for the UI.
 *  The productive window is MEV→MAV; past MAV is "respect the ceiling", not a
 *  target; at/over MRV is too much. */
export type VolumeState = 'below_mev' | 'productive' | 'near_mrv' | 'over_mrv';

export function volumeState(hardSets: number, lm: Landmarks): VolumeState {
  if (hardSets >= lm.mrv) return 'over_mrv';
  if (hardSets >= lm.mav) return 'near_mrv';
  if (hardSets >= lm.mev) return 'productive';
  return 'below_mev';
}

export type VolumeAction = 'add_set' | 'hold' | 'reduce';

/** Recovery markers for a muscle's trend (VOLUME.md). */
export interface Recovery {
  rpeRising: boolean;
  performanceFalling: boolean;
  acwr: number;
}

/**
 * The volume move for a muscle this week, autoregulated against its landmarks:
 *  - below MEV, recovered            → add a set
 *  - room below MAV, recovered       → add a set (caller gates cadence to 1–2 wk)
 *  - at/over MRV, performance falling → reduce (a volume-driven stall)
 *  - approaching MRV, recovery down   → hold
 */
export function volumeAction(hardSets: number, lm: Landmarks, recovery: Recovery): VolumeAction {
  const declining = recovery.rpeRising || recovery.performanceFalling || recovery.acwr > 1.3;
  if (hardSets >= lm.mrv && recovery.performanceFalling) return 'reduce';
  if (declining && hardSets >= lm.mav) return 'hold';
  if (!declining && hardSets < lm.mav) return 'add_set';
  return 'hold';
}

/** Volume is a co-equal progressing variable for hypertrophy; for strength/
 *  endurance the load engine leads and volume is kept in a maintenance band. */
export function volumeLeads(goal: Goal): boolean {
  return goal === 'hypertrophy';
}

export type ProgressionVariable = 'load' | 'volume' | 'none';

/**
 * Choose the ONE variable to progress for a muscle this week — never both load
 * and volume together (VOLUME.md), the same one-variable-at-a-time principle as
 * never adding load and reps in one session.
 */
export function chooseProgressionVariable(
  goal: Goal,
  hardSets: number,
  lm: Landmarks,
  recovery: Recovery,
  loadReady: boolean,
): ProgressionVariable {
  const action = volumeAction(hardSets, lm, recovery);
  if (volumeLeads(goal)) {
    // Hypertrophy: if volume wants to move, it takes the week.
    if (action === 'add_set' || action === 'reduce') return 'volume';
    return loadReady ? 'load' : 'none';
  }
  // Strength/endurance: load leads; only touch volume to restore the maintenance
  // floor (below MV) — and even then, not alongside load.
  if (hardSets < lm.mv) return 'volume';
  return loadReady ? 'load' : 'none';
}
