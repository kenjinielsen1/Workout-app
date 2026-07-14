// Versioned evidence config (EVIDENCE_CONFIG.md). Every research-derived number
// lives in evidence-config.v{N}.json, each carrying its source, note, and
// confidence. The engine reads ONLY through this typed accessor — no research
// constant is inlined anywhere in the engine. When the science moves, edit the
// JSON and bump the version; per-user calibration offsets are deltas from these
// priors, so a bump shifts everyone without wiping personal calibration.
//
// Physical constants (bar weight, plate grids, unit conversions) are NOT here —
// those are equipment facts, not evidence (see constants.ts / units.ts).

import raw from '../config/evidence-config.v1.json';
import type { Goal } from './types';

export type Confidence = 'high' | 'moderate' | 'limited';

interface Param<V> {
  value: V;
  source: string;
  note: string;
  confidence: Confidence;
}
type Params = Record<string, Param<unknown>>;

const CONFIG = raw as { version: number; updated: string; parameters: Params };

/** The active evidence-config version — recorded on every recommendation. */
export const CONFIG_VERSION: number = CONFIG.version;

/** Raw parameter record (value + source + note + confidence) for the UI/tests. */
export function getParam(name: string): Param<unknown> {
  const p = CONFIG.parameters[name];
  if (!p) throw new Error(`evidence-config: unknown parameter "${name}"`);
  return p;
}

/** The evidence confidence for a parameter, so the UI can reflect real certainty. */
export function paramConfidence(name: string): Confidence {
  return getParam(name).confidence;
}

const val = <V>(name: string): V => getParam(name).value as V;

// --- typed accessors (the only way the engine reads evidence numbers) -------

type Bracket = { under_months: number | null; bias?: number; fraction?: number };
function pickBracket(brackets: Bracket[], months: number): Bracket {
  return brackets.find((b) => b.under_months === null || months < b.under_months) ?? brackets[brackets.length - 1]!;
}

export function experienceBias(months: number): number {
  return pickBracket(val<Bracket[]>('rir_experience_bias'), months).bias!;
}

export function repPenalty(): { perRep: number; aboveReps: number } {
  const v = val<{ per_rep: number; above_reps: number }>('rir_rep_penalty');
  return { perRep: v.per_rep, aboveReps: v.above_reps };
}

export function distancePenalty(): { penalty: number; atOrAboveRir: number } {
  const v = val<{ penalty: number; at_or_above_rir: number }>('rir_distance_penalty');
  return { penalty: v.penalty, atOrAboveRir: v.at_or_above_rir };
}

/** Productive proximity window per goal; the target RIR is its midpoint. */
export function proximityWindow(goal: Goal): [number, number] {
  return val<Record<Goal, [number, number]>>('proximity_target_rir')[goal];
}
export function targetRIR(goal: Goal): number {
  const [lo, hi] = proximityWindow(goal);
  return (lo + hi) / 2;
}

export function repRange(goal: Goal, isCompound: boolean): { min: number; max: number } {
  const r = val<Record<Goal, { compound: [number, number]; isolation: [number, number] }>>('rep_ranges')[goal];
  const [min, max] = isCompound ? r.compound : r.isolation;
  return { min, max };
}

export function signalWeights(): { s1: number; s2: number; s3: number; s4: number; s5: number } {
  return val('readiness_signal_weights');
}

export function checkinSignal(): { weight: number; positiveCap: number; sleep: number; soreness: number; energy: number } {
  const v = val<{ weight: number; positive_cap: number; sleep: number; soreness: number; energy: number }>('readiness_checkin_signal');
  return { weight: v.weight, positiveCap: v.positive_cap, sleep: v.sleep, soreness: v.soreness, energy: v.energy };
}

export function readinessThresholds(): { increase: number; addRep: number; repeat: number; flag: number } {
  const v = val<{ increase: number; add_rep: number; repeat: number; flag: number }>('readiness_thresholds');
  return { increase: v.increase, addRep: v.add_rep, repeat: v.repeat, flag: v.flag };
}

export function expectedWeeklyGain(months: number): number {
  return pickBracket(val<Bracket[]>('expected_weekly_gain'), months).fraction!;
}

export function acwrThresholds(): { low: number; elevated: number; veto: number } {
  return val('acwr_thresholds');
}

export function deloadTriggers(): { factor: number; forceAfterSessions: number } {
  const v = val<{ factor: number; force_after_sessions: number }>('deload_triggers');
  return { factor: v.factor, forceAfterSessions: v.force_after_sessions };
}

export function fatigueMasking(): { acwrOver: number; rpeSlopeOver: number } {
  const v = val<{ acwr_over: number; rpe_slope_over: number }>('fatigue_masking');
  return { acwrOver: v.acwr_over, rpeSlopeOver: v.rpe_slope_over };
}

export function increaseVetoes(): { minSessions: number; detrainDays: number } {
  const v = val<{ min_sessions: number; detrain_days: number }>('increase_vetoes');
  return { minSessions: v.min_sessions, detrainDays: v.detrain_days };
}

export function safetyCaps(): { maxE1rmFraction: number; maxIncreasePct: number; maxIncreaseLb: number } {
  const v = val<{ max_e1rm_fraction: number; max_increase_pct: number; max_increase_lb: number }>('safety_caps');
  return { maxE1rmFraction: v.max_e1rm_fraction, maxIncreasePct: v.max_increase_pct, maxIncreaseLb: v.max_increase_lb };
}

export function weeklyIncreaseCap(): { novicePct: number; experiencedPct: number; experiencedAfterMonths: number } {
  const v = val<{ novice_pct: number; experienced_pct: number; experienced_after_months: number }>('weekly_e1rm_increase_cap');
  return { novicePct: v.novice_pct, experiencedPct: v.experienced_pct, experiencedAfterMonths: v.experienced_after_months };
}

export function mlBlend(): { alphaMax: number; sessionsDenom: number } {
  const v = val<{ alpha_max: number; sessions_denom: number }>('ml_blend');
  return { alphaMax: v.alpha_max, sessionsDenom: v.sessions_denom };
}

export function volumeCounting(): { secondaryFraction: number; hardSetRirMargin: number } {
  const v = val<{ secondary_fraction: number; hard_set_rir_margin: number }>('volume_counting');
  return { secondaryFraction: v.secondary_fraction, hardSetRirMargin: v.hard_set_rir_margin };
}

export interface LandmarkValues {
  mv: number;
  mev: number;
  mav: number;
  mrv: number;
}
export function volumeLandmarkDefault(): LandmarkValues {
  return val('volume_landmarks_default');
}
export function volumeLandmarkOverrides(): Record<string, Partial<LandmarkValues>> {
  return val('volume_landmarks_overrides');
}
export function volumeCalibrationAlpha(): number {
  return val('volume_calibration_alpha');
}
