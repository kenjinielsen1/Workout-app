// Weekly summary (WEEKLY_SUMMARY.md) — a VIEW over data the engine already
// produced. This module takes pre-computed pieces (volume vs. personal landmarks,
// balance ratios, e1RM moves, block state, PRs) and assembles the readout + its
// prose. It computes NO training logic of its own.
//
// Three rules, enforced here and in the tests:
//   1. Blunt — plain and unhedged, never harsh, never consoling.
//   2. Report, never prescribe — state the fact and stop. No suggestion, nudge,
//      or "next week" framing. Stating the gap IS the finding.
//   3. A real readout — sections, not a skim.
//
// Safety (SCOPE_SAFETY.md): resting is never a failure; a planned deload's low
// volume is reported as planned, not a shortfall.

import { volumeState, type VolumeState } from './volume';
import type { Landmarks } from './volumeLandmarks';
import { formatE1RM, formatWeightUnit, type WeightUnit } from './units';

/** Consecutive weeks an e1RM must be unchanged before the readout calls it flat. */
export const FLAT_WEEKS = 2;

export type ProgressionMove = 'increased' | 'held' | 'deloaded';

export interface SummaryVolumeRow {
  muscle: string;
  hardSets: number;
  /** PERSONAL band — the caller passes personalLandmarks(muscle, offset), never
   *  the static config prior (WEEKLY_SUMMARY.md / FIXES_AUDIT.md #4). */
  landmarks: Landmarks;
}

export interface SummaryProgression {
  exercise: string;
  /** Primary muscle, so tapping the name in the readout can open its lookup. */
  primaryMuscle: string | null;
  currentE1RMLb: number | null;
  deltaLastWeekLb: number | null;
  delta4wLb: number | null;
  move: ProgressionMove;
  /** Factual cause carried from the engine's rationale (FEATURES.md #3). */
  reason: string;
  /** Consecutive weeks e1RM has not moved (0 when it moved this week). */
  weeksFlat: number;
  /** Recent weekly best e1RMs (lb), oldest→newest, for the sparkline. */
  e1rmSpark: number[];
}

/** The short, blunt status label for the visual row (report-only). */
export function progressionStatus(p: SummaryProgression, plannedDeload: boolean): string {
  if (p.weeksFlat >= FLAT_WEEKS) return `unchanged ${p.weeksFlat} weeks`;
  if (p.move === 'increased') return 'increased load';
  if (p.move === 'deloaded') return `deloaded${plannedDeload ? ' · planned' : p.reason ? ` · ${p.reason}` : ''}`;
  return 'held';
}

export interface SummaryBalance {
  label: string; // "Push : pull"
  ratio: string; // "2.8 : 1"
}

export interface SummaryFatigue {
  acwr: number | null;
  acwrTrend: 'rising' | 'falling' | 'flat' | null;
  avgRpe: number | null;
  avgReadiness: number | null;
  blockLabel: string | null;
}

export interface SummaryPr {
  exercise: string;
  e1rmLb: number;
}

export interface WeeklySummaryInput {
  weekStart: string; // Monday, yyyy-mm-dd
  weekEnd: string; // Sunday
  generatedAt: string;
  unit: WeightUnit;
  sessions: number;
  hardSets: number;
  tonnageLb: number;
  daysTrained: number;
  daysPlanned: number | null;
  plannedDeload: boolean;
  /** 4-week-trend fields are omitted below this (first week / thin history). */
  hasFourWeekHistory: boolean;
  progression: SummaryProgression[];
  volume: SummaryVolumeRow[]; // trained AND untrained (hardSets 0)
  balance: SummaryBalance[];
  fatigue: SummaryFatigue;
  prs: SummaryPr[];
  /** Per-muscle hard-set contributors this week (VOLUME_SUGGESTIONS.md reduce side).
   *  Stored so the lookup is exact for a re-read past week. Keyed by raw muscle. */
  contributors: Record<string, { id: string; name: string; sets: number }[]>;
}

export interface WeeklyVolumeState {
  muscle: string;
  hardSets: number;
  landmarks: Landmarks;
  state: VolumeState;
}

export interface WeeklySummary extends WeeklySummaryInput {
  trained: boolean;
  volumeStates: WeeklyVolumeState[];
  belowMev: string[];
  aboveMrv: string[];
  zeroVolume: string[];
}

const prettyMuscle = (m: string) => m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Assemble the structured summary from pre-computed inputs. Classifies volume
 *  against the PERSONAL bands; derives the below-MEV / above-MRV / zero lists. */
export function buildWeeklySummary(input: WeeklySummaryInput): WeeklySummary {
  const volumeStates: WeeklyVolumeState[] = input.volume.map((v) => ({
    ...v,
    state: volumeState(v.hardSets, v.landmarks),
  }));
  const zeroVolume = volumeStates.filter((v) => v.hardSets === 0).map((v) => prettyMuscle(v.muscle));
  const belowMev = volumeStates
    .filter((v) => v.hardSets > 0 && v.hardSets < v.landmarks.mev)
    .map((v) => prettyMuscle(v.muscle));
  const aboveMrv = volumeStates.filter((v) => v.hardSets > v.landmarks.mrv).map((v) => prettyMuscle(v.muscle));

  return {
    ...input,
    trained: input.sessions > 0,
    volumeStates,
    belowMev,
    aboveMrv,
    zeroVolume,
  };
}

export interface SummarySection {
  title: string;
  lines: string[];
  /** 'pr' → the one warm section (copper). Everything else is iron/chalk. */
  tone?: 'default' | 'pr';
}

const signed = (lb: number, unit: WeightUnit): string => {
  const rounded = Math.round(lb);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${formatWeightUnit(Math.abs(rounded), unit)}`;
};

/** The full readable report as blunt, report-only sections. This is the single
 *  source of the prose — the view lays these out; the guard tests scan them. */
export function summarySections(s: WeeklySummary): SummarySection[] {
  // Zero-training week: state it plainly and stop. No guilt, no prompt to return.
  if (!s.trained) {
    return [{ title: 'This week', lines: ['No sessions logged this week.'] }];
  }

  const u = s.unit;
  const sections: SummarySection[] = [];

  // 1 — The week at a glance.
  const glance: string[] = [
    `You trained ${s.sessions} ${s.sessions === 1 ? 'time' : 'times'} this week.`,
    `${round1(s.hardSets)} hard sets, ${formatWeightUnit(s.tonnageLb, u)} total tonnage.`,
  ];
  glance.push(
    s.daysPlanned != null
      ? `${s.daysTrained} of ${s.daysPlanned} planned days trained.`
      : `${s.daysTrained} ${s.daysTrained === 1 ? 'day' : 'days'} trained.`,
  );
  sections.push({ title: 'The week at a glance', lines: glance });

  // 2 — Progression: what moved. A flat lift is stated as flat.
  if (s.progression.length) {
    const lines = s.progression.map((p) => `${p.exercise}: ${progressionSuffix(p, u, s.plannedDeload, s.hasFourWeekHistory)}`);
    sections.push({ title: 'Progression', lines });
  }

  // 3 — Volume per muscle against the PERSONAL band. The centerpiece.
  const vol: string[] = [];
  if (s.plannedDeload) {
    vol.push('Planned deload week — low volume is intended, not a shortfall.');
  }
  for (const v of s.volumeStates.filter((x) => x.hardSets > 0)) {
    vol.push(`${prettyMuscle(v.muscle)}: ${round1(v.hardSets)} hard sets. MEV ${v.landmarks.mev}, MRV ${v.landmarks.mrv}.`);
  }
  if (s.belowMev.length) vol.push(`Below MEV: ${list(s.belowMev)}.`);
  if (s.aboveMrv.length) vol.push(`Above MRV: ${list(s.aboveMrv)}.`);
  if (s.zeroVolume.length) vol.push(`No volume this week: ${list(s.zeroVolume)}.`);
  if (vol.length) sections.push({ title: 'Volume', lines: vol });

  // 4 — Balance. Report the ratio; never suggest the fix.
  if (s.balance.length) {
    sections.push({ title: 'Balance', lines: s.balance.map((b) => `${b.label} ${b.ratio}.`) });
  }

  // 5 — Fatigue & readiness. Context, not a recommendation.
  const f = s.fatigue;
  const fat: string[] = [];
  if (f.acwr != null) {
    const trend = f.acwrTrend && f.acwrTrend !== 'flat' ? `, ${f.acwrTrend}` : '';
    fat.push(`ACWR ${f.acwr.toFixed(2)} at week end${trend}.`);
  }
  if (f.avgRpe != null) fat.push(`Average session RPE ${f.avgRpe.toFixed(1)}.`);
  if (f.avgReadiness != null) fat.push(`Average readiness ${f.avgReadiness.toFixed(1)} of 5.`);
  if (f.blockLabel) fat.push(`${f.blockLabel}.`);
  if (fat.length) sections.push({ title: 'Fatigue & readiness', lines: fat });

  // 6 — PRs. The one place the summary is allowed warmth (copper). Silent if none.
  if (s.prs.length) {
    sections.push({
      title: 'Personal records',
      tone: 'pr',
      lines: s.prs.map((p) => `New best — ${p.exercise} ${formatE1RM(p.e1rmLb, u)} ${u} e1RM.`),
    });
  }

  return sections;
}

/** The progression line minus the leading "{exercise}: " — shared by the prose and
 *  the view (which renders the exercise name as its own tappable element). */
export function progressionSuffix(p: SummaryProgression, unit: WeightUnit, plannedDeload: boolean, hasFourWeekHistory: boolean): string {
  const e1 = p.currentE1RMLb != null ? `e1RM ${formatE1RM(p.currentE1RMLb, unit)} ${unit}` : 'no working sets';
  if (p.weeksFlat >= FLAT_WEEKS) return `${e1}, unchanged for ${p.weeksFlat} weeks.`;
  const delta = p.deltaLastWeekLb != null && p.currentE1RMLb != null ? ` (${signed(p.deltaLastWeekLb, unit)} vs last week)` : '';
  const verb = p.move === 'increased' ? 'increased load' : p.move === 'deloaded' ? `deloaded${plannedDeload ? ' (planned)' : ''}` : 'held';
  const four = hasFourWeekHistory && p.delta4wLb != null ? ` ${signed(p.delta4wLb, unit)} over 4 weeks.` : '';
  const reason = p.reason ? ` ${p.reason}.` : '';
  return `${verb}. ${e1}${delta}.${four}${reason}`;
}

const round1 = (n: number): string => String(Number(n.toFixed(1)));
const list = (xs: string[]): string => xs.join(', ');
