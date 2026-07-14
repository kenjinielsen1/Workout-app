// Scope & safety boundaries (SCOPE_SAFETY.md). The most important module: it
// defines what the app will NOT do. Training guidance yes, medical/clinical
// judgment no. Every message here is plain, calm, non-diagnostic, and routes to a
// human when the situation leaves the app's competence. No function in this file
// ever names a condition, prescribes treatment, or encourages training through pain.

import type { MovementPattern } from './types';

// --- pain ------------------------------------------------------------------

/** What the user reported when flagging pain. Both are PAIN (not mere soreness)
 *  and both freeze progression; joint/sharp escalates to a referral sooner. */
export type PainType = 'muscular' | 'joint_sharp';

/** A pain report attached to one exercise in one session. */
export interface PainFlag {
  exercise_id: string;
  performed_at: string; // ISO
  type: PainType;
}

/** Self-reported red flags that always warrant a professional, immediately. */
export interface RedFlags {
  numbness?: boolean;
  radiating?: boolean;
  painAtRest?: boolean; // pain unrelated to / worsening away from training
}

/** Sessions with pain past this count on the SAME movement → referral. */
export const SAME_MOVEMENT_PAIN_THRESHOLD = 3;

export interface ReferralResult {
  refer: boolean;
  /** Non-diagnostic reason, safe to show. Empty when no referral. */
  reason: string;
}

/**
 * Decide whether to surface a "consider a professional" message. Never triages
 * severity, never names a cause — only observes a pattern the app can't judge.
 */
export function painReferral(
  flags: PainFlag[],
  redFlags: RedFlags = {},
): ReferralResult {
  if (redFlags.numbness || redFlags.radiating || redFlags.painAtRest) {
    return { refer: true, reason: 'You described pain that isn’t typical training discomfort.' };
  }
  if (flags.some((f) => f.type === 'joint_sharp')) {
    return { refer: true, reason: 'You’ve flagged sharp or joint pain on a lift.' };
  }
  // Same movement across the threshold number of distinct sessions.
  const byExercise = new Map<string, Set<string>>();
  for (const f of flags) {
    const set = byExercise.get(f.exercise_id) ?? new Set<string>();
    set.add(f.performed_at);
    byExercise.set(f.exercise_id, set);
  }
  for (const sessions of byExercise.values()) {
    if (sessions.size >= SAME_MOVEMENT_PAIN_THRESHOLD) {
      return { refer: true, reason: 'You’ve logged pain on the same movement several sessions running.' };
    }
  }
  return { refer: false, reason: '' };
}

/** The referral message — states the boundary honestly, doesn't alarm or triage. */
export const PROFESSIONAL_REFERRAL_MESSAGE =
  'This app is a training tool, not a clinician. Pain that keeps showing up is worth a look ' +
  'from a professional who can physically assess it — that’s outside what an app should judge.';

/** Whether the pain veto should freeze this exercise: ANY pain logged in the most
 *  recent session for it. Pain freezes progression, full stop — no score,
 *  streak, or goal ever unfreezes it. */
export function painFreezesExercise(latestSessionPain: PainType | null): boolean {
  return latestSessionPain !== null;
}

// --- disordered / over-training patterns -----------------------------------

/** Signals that the user may be over-reaching against the plan. */
export interface OverreachSignal {
  /** Times the user logged well above the recommended load/volume recently. */
  upwardOverrides: number;
  /** Consecutive days trained with no rest. */
  consecutiveDaysNoRest: number;
  /** Prescribed deloads skipped/ignored. */
  ignoredDeloads: number;
}

export const OVERRIDE_THRESHOLD = 3;
export const NO_REST_DAYS_THRESHOLD = 14;
export const IGNORED_DELOAD_THRESHOLD = 2;

/**
 * A gentle, evidence-based nudge when over-reaching is detected — never a lecture,
 * never a diagnosis, and NEVER encouragement to keep pushing. Returns null when
 * nothing to say.
 */
export function overreachNudge(s: OverreachSignal): string | null {
  const pronounced =
    s.upwardOverrides >= OVERRIDE_THRESHOLD ||
    s.consecutiveDaysNoRest >= NO_REST_DAYS_THRESHOLD ||
    s.ignoredDeloads >= IGNORED_DELOAD_THRESHOLD;
  if (!pronounced) return null;
  const base =
    'You’ve been pushing past what the plan recommends lately. Recovery is when adaptation ' +
    'happens — more isn’t better past a point, and backing off now tends to pay off.';
  const escalate =
    s.consecutiveDaysNoRest >= NO_REST_DAYS_THRESHOLD * 1.5 || s.ignoredDeloads >= IGNORED_DELOAD_THRESHOLD + 1;
  return escalate
    ? `${base} If this pattern keeps up, a coach or clinician can help you get more from less.`
    : base;
}

/** Rest/deload is PRESCRIBED, not permitted — framed so resting never feels like
 *  failure. There is no streak to break; this is the plan working. */
export function restFraming(): string {
  return 'Today is a prescribed rest/deload — that’s the plan working, not a day off from it. ' +
    'Adaptation happens while you recover; there’s no streak to keep.';
}

// --- special populations ----------------------------------------------------

export type SpecialPopulation =
  | 'pregnancy'
  | 'post_surgical'
  | 'cardiovascular'
  | 'minor';

export const SPECIAL_POPULATION_LABELS: Record<SpecialPopulation, string> = {
  pregnancy: 'pregnancy or postpartum',
  post_surgical: 'a post-surgical return',
  cardiovascular: 'a diagnosed cardiovascular condition',
  minor: 'being under 18',
};

/** General-information framing + referral for a special population. The app does
 *  NOT tailor programming for these; it treats its output as general information. */
export function specialPopulationMessage(pop: SpecialPopulation): string {
  return `Because you’ve indicated ${SPECIAL_POPULATION_LABELS[pop]}, treat everything here as ` +
    'general information only, and work with a qualified professional for programming. The ' +
    'evidence this app is built on may not fit your situation.';
}

// --- onboarding + evidence boundary ----------------------------------------

export const ONBOARDING_DISCLAIMER =
  'This is an educational training tool, not medical advice. Talk to a professional before ' +
  'starting a program — especially with any pre-existing condition. It coaches training; it ' +
  'does not diagnose or treat.';

/** The literature skews young, trained, male. Say so — lighter touch, honest
 *  confidence — for under-represented cases the app can detect (a detrained
 *  return after a long layoff, or a special-population indication). */
export function evidenceCaveat(opts: { daysSinceLast?: number; special?: boolean }): string | null {
  if (opts.special) {
    return 'Heads up: most training research studies young, trained lifters, so its confidence is ' +
      'lower for your situation. Treat these as starting points, not certainties.';
  }
  if ((opts.daysSinceLast ?? 0) >= 21) {
    return 'You’re coming back after a layoff — start conservatively. Returning strength comes back ' +
      'fast, but the evidence is thinner for detrained returns, so ease in.';
  }
  return null;
}

// --- diagnostic-language guard ----------------------------------------------

/** Condition names and diagnostic phrasings the app must NEVER emit. Used by the
 *  test guard to prove no output path produces medical language. */
// Condition names + treatment/diagnostic PHRASINGS. The bare verb "diagnose" is
// intentionally NOT here — it appears in the app's own boundary statement ("does
// not diagnose"), which is the opposite of diagnostic output. Real diagnostic
// output is caught by a condition name or an asserting phrase below.
export const DIAGNOSTIC_TERMS: readonly string[] = [
  'tendinitis', 'tendonitis', 'tendinopathy', 'sprain', 'herniat', 'impingement',
  'arthritis', 'bursitis', 'sciatica', 'fracture', 'rotator cuff',
  'sounds like', 'you have ', 'you might have', 'it’s likely you',
  'rehab protocol', 'stretches to fix', 'return-to-training',
];

/** True if `text` contains any diagnostic term (case-insensitive). */
export function containsDiagnosticLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return DIAGNOSTIC_TERMS.some((t) => lower.includes(t));
}

/** Every user-facing safety string this module can emit — the guard checks them all. */
export function allSafetyMessages(): string[] {
  const pops = Object.keys(SPECIAL_POPULATION_LABELS) as SpecialPopulation[];
  return [
    PROFESSIONAL_REFERRAL_MESSAGE,
    ONBOARDING_DISCLAIMER,
    restFraming(),
    overreachNudge({ upwardOverrides: 99, consecutiveDaysNoRest: 99, ignoredDeloads: 99 }) ?? '',
    evidenceCaveat({ special: true }) ?? '',
    evidenceCaveat({ daysSinceLast: 30 }) ?? '',
    painReferral([], { numbness: true }).reason,
    painReferral([{ exercise_id: 'x', performed_at: '2026-01-01', type: 'joint_sharp' }]).reason,
    ...pops.map(specialPopulationMessage),
  ];
}

// Re-export so callers building pain UI stay in this module's vocabulary.
export type { MovementPattern };
