// Bridge: assemble a ProgContext for the progression engine from logged session
// records + a profile. This is the piece that lets the evidence-based recommendation
// (progression.ts) replace the interim "repeat last session" target — it supplies
// the cross-cutting context (ACWR, days-since-last, deload cadence, best e1RM) that
// the engine can't derive from a single exercise's history alone.

import { acwr, metricsSeries, type FeatureExercise, type FeatureSession } from './features';
import {
  recommendProgression,
  type ProgContext,
  type ProgProfile,
  type ProgRecommendation,
  type ProgSession,
} from './progression';
import type { SessionTarget } from './target';

const DAY = 86_400_000;
const t = (iso: string) => new Date(iso).getTime();

/** A deload is a >8% drop in top-set weight from the IMMEDIATELY prior session
 *  (a step-down event) — not merely being below an old running max, which would
 *  keep firing on every lighter session while a lifter rebuilds. */
function sessionsSinceLastDeload(topWeights: number[]): number {
  let lastDeloadIdx = -1;
  for (let i = 1; i < topWeights.length; i++) {
    if (topWeights[i]! < topWeights[i - 1]! * 0.92) lastDeloadIdx = i;
  }
  return lastDeloadIdx === -1 ? topWeights.length : topWeights.length - 1 - lastDeloadIdx;
}

/**
 * Build the engine context for `ex` as of `refT` (default: just after the last
 * session). `allSessions` spans every exercise (for movement-pattern ACWR);
 * `index` maps exercise ids to attributes; `profile` supplies goal / training age /
 * calibration.
 *
 * The per-session `target_reps` is reconstructed as the previous session's top-set
 * reps — historical prescriptions aren't persisted yet, so this is a documented
 * proxy that the engine's rep-quality signal reads.
 */
export function buildProgContext(
  allSessions: FeatureSession[],
  ex: FeatureExercise,
  index: Map<string, FeatureExercise>,
  profile: ProgProfile,
  refT?: number,
  dailyReadinessValue: number | null = null,
  plannedDeload = false,
): ProgContext {
  const exerciseSessions = allSessions
    .filter((s) => s.exercise_id === ex.id)
    .sort((a, b) => t(a.performed_at) - t(b.performed_at));
  const metrics = metricsSeries(allSessions, ex, profile);

  const reference =
    refT ?? (metrics.length ? metrics[metrics.length - 1]!.t + 1 : Date.now());

  // Reconstruct per-session target reps from the prior session's top set.
  const progSessions: ProgSession[] = exerciseSessions.map((s, i) => {
    const prev = metrics[i - 1];
    const own = metrics[i];
    const target_reps = prev?.topReps ?? own?.topReps ?? 5;
    return {
      performed_at: s.performed_at,
      target_reps,
      session_rpe: s.session_rpe ?? null,
      // SCOPE_SAFETY.md: any pain flagged on this exercise this session freezes
      // progression. Read from real per-set pain, not a placeholder.
      pain_note: s.sets.some((set) => set.pain != null),
      sets: s.sets,
    };
  });

  const last = metrics[metrics.length - 1];
  const daysSinceLast = last ? (reference - last.t) / DAY : 0;
  const bestHistoricalE1RM = metrics.length ? Math.max(...metrics.map((m) => m.e1rm)) : 0;

  return {
    exercise: ex,
    user: profile,
    history: progSessions,
    acwr: acwr(allSessions, index, profile, ex.movement_pattern, reference),
    daysSinceLast,
    sessionsThisExercise: metrics.length,
    bestHistoricalE1RM,
    sessionsSinceLastDeload: sessionsSinceLastDeload(metrics.map((m) => m.topWeight)),
    previousWasFlagged: false,
    dailyReadiness: dailyReadinessValue,
    plannedDeload,
  };
}

/** Map a recommendation to the SessionTarget shape the Log Set screen consumes. */
export function toSessionTarget(rec: ProgRecommendation): SessionTarget {
  return {
    target_weight_lb: rec.target_weight_lb,
    target_reps: rec.target_reps,
    target_sets: rec.target_sets,
    rationale: rec.rationale,
  };
}

/** One-shot: context → recommendation → SessionTarget for the given exercise. */
export function recommendSessionTarget(
  allSessions: FeatureSession[],
  ex: FeatureExercise,
  index: Map<string, FeatureExercise>,
  profile: ProgProfile,
  refT?: number,
): SessionTarget {
  if (metricsSeries(allSessions, ex, profile).length === 0) {
    // No history — nothing for the engine to reason about; caller falls back.
    return { target_weight_lb: 0, target_reps: 0, target_sets: 0 };
  }
  const ctx = buildProgContext(allSessions, ex, index, profile, refT);
  return toSessionTarget(recommendProgression(ctx));
}
