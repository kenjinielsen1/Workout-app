// Movement-pattern balance monitor (PROGRAMMING.md Part B). A real assistant
// notices structural imbalances — all horizontal push and no pull, quad-dominant
// with no hinge — that raise injury risk and stall progress. This is a
// DISTRIBUTION view of the same hard-set volume the VOLUME.md magnitude view
// uses (it shares isHardSet, so it doesn't recompute counting independently).
// Observations, never mandates; dismissible as intentional.

import { isHardSet, type VolExercise, type VolProfile, type VolSession } from './volume';
import type { Goal, MovementPattern } from './types';

const WINDOW_DAYS = 28; // rolling 2–4 week window
const IMBALANCE_RATIO = 2; // >2:1 either way is a sustained imbalance
const MEANINGFUL_SETS = 6; // the dominant side must be non-trivial to bother flagging
const NEGLECT_SETS = 2; // at/below this while others are high = neglected
const NEGLECT_PEER = 8; // "others high" bar
const WORSEN_FACTOR = 1.25; // a dismissed flag re-surfaces only if it worsens this much

export type BalanceType = 'push_pull' | 'anterior_posterior' | 'neglected';

export interface BalanceObservation {
  type: BalanceType;
  /** Stable id for dismissal (e.g. 'push_pull', 'neglected:vertical_pull'). */
  key: string;
  message: string;
  /** The under-trained pattern a fix should add. */
  underPattern: MovementPattern;
  /** Magnitude of the imbalance, so "materially worsens" is measurable. */
  severity: number;
  /** A concrete catalog fix, if one exists for the under-trained pattern. */
  suggestion?: { id: string; name: string };
}

export interface DismissedFlag {
  severity: number; // the imbalance level when the user marked it intentional
}

interface CatalogExercise {
  id: string;
  name: string;
  movement_pattern: MovementPattern;
}

const DAY = 86_400_000;

/** Hard sets per movement pattern over the rolling window (shares isHardSet with
 *  VOLUME.md so counting stays consistent). One set → 1.0 to its pattern. */
export function patternVolume(
  sessions: VolSession[],
  index: Map<string, VolExercise & { movement_pattern: MovementPattern }>,
  profile: VolProfile,
  goal: Goal,
  nowISO: string,
  windowDays = WINDOW_DAYS,
): Map<MovementPattern, number> {
  const lo = Date.parse(nowISO) - windowDays * DAY;
  const totals = new Map<MovementPattern, number>();
  for (const s of sessions) {
    if (Date.parse(s.performed_at) < lo) continue;
    const ex = index.get(s.exercise_id);
    if (!ex) continue;
    const hard = s.sets.filter((set) => isHardSet(set, profile, goal)).length;
    if (hard > 0) totals.set(ex.movement_pattern, (totals.get(ex.movement_pattern) ?? 0) + hard);
  }
  return totals;
}

const get = (m: Map<MovementPattern, number>, p: MovementPattern) => m.get(p) ?? 0;

function fix(pattern: MovementPattern, catalog: CatalogExercise[]): { id: string; name: string } | undefined {
  const ex = catalog.find((c) => c.movement_pattern === pattern);
  return ex ? { id: ex.id, name: ex.name } : undefined;
}

/**
 * Structural-balance observations over the window. At most one push:pull and one
 * anterior:posterior flag, plus any neglected pattern not already named by those.
 */
export function balanceObservations(
  vol: Map<MovementPattern, number>,
  catalog: CatalogExercise[],
): BalanceObservation[] {
  const out: BalanceObservation[] = [];
  const covered = new Set<MovementPattern>();

  // Push : pull (across both planes).
  const push = get(vol, 'horizontal_push') + get(vol, 'vertical_push');
  const pull = get(vol, 'horizontal_pull') + get(vol, 'vertical_pull');
  const [big, small, bigLabel, smallPlane] =
    push >= pull
      ? [push, pull, 'push', get(vol, 'horizontal_pull') <= get(vol, 'vertical_pull') ? 'horizontal_pull' : 'vertical_pull']
      : [pull, push, 'pull', get(vol, 'horizontal_push') <= get(vol, 'vertical_push') ? 'horizontal_push' : 'vertical_push'];
  if (big >= MEANINGFUL_SETS && small * IMBALANCE_RATIO < big) {
    const under = smallPlane as MovementPattern;
    // The whole under-trained side is covered by this one flag, so its other plane
    // isn't ALSO reported as "neglected".
    if (push >= pull) covered.add('horizontal_pull').add('vertical_pull');
    else covered.add('horizontal_push').add('vertical_push');
    const ratio = small > 0 ? big / small : Infinity;
    out.push({
      type: 'push_pull',
      key: 'push_pull',
      message: `Your ${bigLabel} volume is about ${small > 0 ? Math.round(ratio) : '∞'}× your ${bigLabel === 'push' ? 'pull' : 'push'} over the last month. Balancing it lowers shoulder-health risk and often unblocks pressing.`,
      underPattern: under,
      severity: Number((small > 0 ? ratio : big).toFixed(2)),
      suggestion: fix(under, catalog),
    });
  }

  // Anterior (quad) : posterior (hinge).
  const ant = get(vol, 'squat') + get(vol, 'lunge');
  const post = get(vol, 'hinge');
  const [aBig, aSmall, underPat] = ant >= post ? [ant, post, 'hinge' as MovementPattern] : [post, ant, 'squat' as MovementPattern];
  if (aBig >= MEANINGFUL_SETS && aSmall * IMBALANCE_RATIO < aBig) {
    covered.add(underPat);
    const ratio = aSmall > 0 ? aBig / aSmall : Infinity;
    out.push({
      type: 'anterior_posterior',
      key: 'anterior_posterior',
      message: `Your ${ant >= post ? 'quad (squat)' : 'posterior-chain (hinge)'} volume is about ${aSmall > 0 ? Math.round(ratio) : '∞'}× the other over the last month. Evening it out protects the knees/low back and helps both lifts.`,
      underPattern: underPat,
      severity: Number((aSmall > 0 ? ratio : aBig).toFixed(2)),
      suggestion: fix(underPat, catalog),
    });
  }

  // Neglected patterns: near-zero while others are high (not already covered).
  const peakVolume = Math.max(0, ...vol.values());
  if (peakVolume >= NEGLECT_PEER) {
    for (const p of ['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'squat', 'hinge'] as MovementPattern[]) {
      if (covered.has(p)) continue;
      if (get(vol, p) <= NEGLECT_SETS) {
        out.push({
          type: 'neglected',
          key: `neglected:${p}`,
          message: `You've done almost no ${p.replace(/_/g, ' ')} in the last month while other patterns are high. A neglected pattern is a common source of stalls and imbalance.`,
          underPattern: p,
          severity: Number((peakVolume - get(vol, p)).toFixed(2)),
          suggestion: fix(p, catalog),
        });
      }
    }
  }

  return out;
}

/** Whether an observation should surface given a prior "intentional" dismissal —
 *  suppressed until it worsens materially (severity climbs by WORSEN_FACTOR). */
export function shouldSurface(obs: BalanceObservation, dismissed: DismissedFlag | undefined): boolean {
  if (!dismissed) return true;
  return obs.severity >= dismissed.severity * WORSEN_FACTOR;
}

/** Apply dismissals, returning only the observations worth showing this window. */
export function activeObservations(
  observations: BalanceObservation[],
  dismissals: Record<string, DismissedFlag>,
): BalanceObservation[] {
  return observations.filter((o) => shouldSurface(o, dismissals[o.key]));
}
