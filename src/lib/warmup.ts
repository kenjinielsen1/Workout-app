// Warm-up set prescription (FEATURES.md #1). A ramp from a light load up to the
// day's working weight, so the lifter doesn't do the arithmetic mid-session.
// Opt-in (user_profile.warmup_enabled); off by default. Every warm-up is logged
// with is_warmup = true and so is excluded from e1RM / tonnage / ACWR /
// progression (handled everywhere by the working-set filters).
//
// All weights route through snapToLoadable, which also enforces the 45 lb barbell
// floor — so a barbell ramp never prescribes below the empty bar, and nothing
// unloadable is ever emitted.

import { equipmentIncrement, snapToLoadable } from './rounding';
import type { Equipment, LoadType } from './types';

export interface WarmupExercise {
  equipment: Equipment;
  load_type: LoadType;
  is_compound: boolean;
  default_increment_lb: number;
  weight_increment_lb?: number | null;
  weight_stack_min_lb?: number | null;
}
export interface WarmupProfile {
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
}
export interface WarmupSet {
  weight_lb: number;
  reps: number;
  is_warmup: true;
}

const BAR = 45;
// Standard percentage ramp; heavier warm-ups sit closer to the working weight.
const RAMP: { pct: number; reps: number }[] = [
  { pct: 0.4, reps: 8 },
  { pct: 0.55, reps: 5 },
  { pct: 0.7, reps: 3 },
  { pct: 0.85, reps: 1 },
];
// Isolation / machine work: a short primer, no deep ramp.
const PRIMER: { pct: number; reps: number }[] = [
  { pct: 0.5, reps: 8 },
  { pct: 0.7, reps: 5 },
];

/** Free-weight compounds get a full ramp; everything else a light primer. */
function isRampWorthy(ex: WarmupExercise): boolean {
  return ex.is_compound && (ex.equipment === 'barbell' || ex.equipment === 'dumbbell');
}

/** Anchor for how many ramp sets a load deserves (bar for barbells). */
function base(ex: WarmupExercise): number {
  return ex.equipment === 'barbell' ? BAR : 20;
}

/** More warm-up sets as the working weight climbs; ≤2 below ~1.5× the anchor. */
function rampCount(workingLb: number, ex: WarmupExercise): number {
  const r = workingLb / base(ex);
  return r < 1.5 ? 1 : r < 2.5 ? 2 : r < 4 ? 3 : 4;
}

/**
 * The warm-up ramp for a working weight, or [] when there's nothing to ramp to
 * (working weight already at/below the floor). Weights are loadable, strictly
 * increasing, and always below the working weight.
 */
export function warmupSets(
  workingLb: number,
  ex: WarmupExercise,
  profile: WarmupProfile,
): WarmupSet[] {
  const floor = ex.equipment === 'barbell' ? BAR : 0;
  if (workingLb <= floor) return [];

  const rows = isRampWorthy(ex)
    ? RAMP.slice(RAMP.length - rampCount(workingLb, ex)) // heaviest N, approaching working
    : PRIMER.slice(0, workingLb / base(ex) < 1.5 ? 1 : 2);

  const step = equipmentIncrement(ex, profile);
  const out: WarmupSet[] = [];
  let prev = 0;
  for (const { pct, reps } of rows) {
    let w = snapToLoadable(workingLb * pct, ex, profile, 'floor'); // enforces 45 bar floor
    if (w >= workingLb) w = snapToLoadable(workingLb - step, ex, profile, 'floor');
    if (w <= 0 || w >= workingLb || w <= prev) continue; // loadable, below working, increasing
    prev = w;
    out.push({ weight_lb: w, reps, is_warmup: true });
  }
  return out;
}

/** Gated entry point: [] unless the user has opted into warm-ups. */
export function warmupPlan(
  workingLb: number,
  ex: WarmupExercise,
  profile: WarmupProfile,
  enabled: boolean,
): WarmupSet[] {
  return enabled ? warmupSets(workingLb, ex, profile) : [];
}
