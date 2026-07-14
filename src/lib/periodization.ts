// Proactive periodization (PROGRAMMING.md Part A). Plans hard and easy weeks so a
// lifter stalls LESS, instead of only deloading reactively after a stall. A simple
// undulating block sets the week's INTENT; autoregulation (PROGRESSION.md) still
// modulates the specific prescription within it — except a PLANNED deload, which
// holds against readiness (that's exactly where lifters override and hurt
// themselves). Reactive deloads still exist as a mid-block safety net.

import { weekStartOf } from './volume';
import type { Goal } from './types';

export type Phase = 'accumulation' | 'intensification' | 'deload';

// Evidence-supported undulating structure: build → express → recover, repeating.
const PLAN: { phase: Phase; weeks: number }[] = [
  { phase: 'accumulation', weeks: 3 }, // volume builds toward upper MAV, moderate intensity
  { phase: 'intensification', weeks: 2 }, // volume trims, intensity rises
  { phase: 'deload', weeks: 1 }, // planned ~50% volume, scheduled — not stall-driven
];
export const CYCLE_WEEKS = PLAN.reduce((n, p) => n + p.weeks, 0); // 6

const DAY = 86_400_000;

export interface BlockPosition {
  phase: Phase;
  /** 1-based week within the whole cycle (1..CYCLE_WEEKS). */
  weekInBlock: number;
  /** 1-based week within the current phase. */
  weekInPhase: number;
}

/** Where `now` falls in the cycle that began at `anchor` (both ISO). Weeks are
 *  aligned to ISO week starts, so a block advances on Mondays. */
export function blockPosition(anchorISO: string, nowISO: string): BlockPosition {
  const a = Date.parse(`${weekStartOf(anchorISO)}T00:00:00Z`);
  const n = Date.parse(`${weekStartOf(nowISO)}T00:00:00Z`);
  const weeksElapsed = Math.max(0, Math.floor((n - a) / (7 * DAY)));
  let w = weeksElapsed % CYCLE_WEEKS;
  for (const p of PLAN) {
    if (w < p.weeks) return { phase: p.phase, weekInBlock: (weeksElapsed % CYCLE_WEEKS) + 1, weekInPhase: w + 1 };
    w -= p.weeks;
  }
  // Unreachable, but keep the type total.
  return { phase: 'accumulation', weekInBlock: 1, weekInPhase: 1 };
}

export interface PhaseIntent {
  /** Volume bias for the week: build toward MAV, trim for intensity, or reduce. */
  volume: 'build' | 'trim' | 'reduce';
  /** A planned deload holds — no load increases this week regardless of readiness. */
  suppressIncreases: boolean;
  label: string;
}

export function phaseIntent(phase: Phase): PhaseIntent {
  switch (phase) {
    case 'accumulation':
      return { volume: 'build', suppressIncreases: false, label: 'Accumulation — build volume' };
    case 'intensification':
      return { volume: 'trim', suppressIncreases: false, label: 'Intensification — push intensity' };
    case 'deload':
      return { volume: 'reduce', suppressIncreases: true, label: 'Deload — planned recovery' };
  }
}

/** Periodization defaults ON for strength/hypertrophy; OFF for endurance (and any
 *  user can toggle it). Someone who just wants session-to-session progression can
 *  turn it off — adherence beats an unwanted rigid program. */
export function periodizationOnByDefault(goal: Goal): boolean {
  return goal === 'hypertrophy' || goal === 'strength';
}

/** Is `now` in a planned deload week of the active block? False when disabled. */
export function isPlannedDeloadWeek(
  anchorISO: string | null | undefined,
  nowISO: string,
  enabled: boolean,
): boolean {
  if (!enabled || !anchorISO) return false;
  return blockPosition(anchorISO, nowISO).phase === 'deload';
}
