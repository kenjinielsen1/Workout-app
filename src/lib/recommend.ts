// Orchestrates the full recommendation: rule engine (via progContext) → optional
// ML blend → safety rails → rounding. This is what the Log Set screen calls to get
// its target. Pure given its inputs; the ML prediction is fetched separately (async)
// and passed in, so this stays synchronous and testable.

import {
  extractFeatures,
  featureVectorToArray,
  metricsSeries,
  type FeatureExercise,
  type FeatureSession,
} from './features';
import { buildProgContext } from './progContext';
import { recommendProgression, type ProgProfile } from './progression';
import { finalizeTarget, type FinalTarget, type MLPrediction } from './blend';
import { snapToLoadable } from './rounding';

const DAY = 86_400_000;

/** Ordered feature vector for one exercise, ready to POST to the ML service. */
export function exerciseFeatures(
  allSessions: FeatureSession[],
  ex: FeatureExercise,
  index: Map<string, FeatureExercise>,
  profile: ProgProfile,
): number[] {
  return featureVectorToArray(extractFeatures(allSessions, ex, index, profile));
}

/** Count of logged sessions for a specific exercise (drives cold start). */
export function sessionsForExercise(allSessions: FeatureSession[], exerciseId: string): number {
  return allSessions.filter((s) => s.exercise_id === exerciseId).length;
}

/**
 * The final target for `ex`, or null when there's no history for it (caller falls
 * back to a starting-weight default). `ml` is the ML service's prediction, or null
 * to use the rule engine alone.
 */
export function recommendTarget(
  allSessions: FeatureSession[],
  ex: FeatureExercise,
  index: Map<string, FeatureExercise>,
  profile: ProgProfile,
  ml: MLPrediction | null = null,
  alphaCap = 1,
  dailyReadinessValue: number | null = null,
): FinalTarget | null {
  const series = metricsSeries(allSessions, ex, profile);
  if (series.length === 0) return null;

  const ctx = buildProgContext(allSessions, ex, index, profile, undefined, dailyReadinessValue);
  const rule = recommendProgression(ctx);

  const last = series[series.length - 1]!;
  const priorTopWeight = snapToLoadable(last.topWeight, ex, profile, 'nearest');

  // Baseline for the weekly-e1RM rail: the most recent session at least 7 days
  // before the last one (else the earliest we have).
  const weekAgo = series.filter((m) => last.t - m.t >= 7 * DAY);
  const baselineWeeklyE1RM = (weekAgo.length ? weekAgo[weekAgo.length - 1]! : series[0]!).e1rm;

  return finalizeTarget({
    rule,
    ml,
    sessionsLogged: allSessions.length,
    alphaCap,
    rail: {
      priorTopWeight,
      targetReps: rule.target_reps,
      bestHistoricalE1RM: ctx.bestHistoricalE1RM,
      baselineWeeklyE1RM,
      trainingAgeMonths: profile.training_age_months,
      acwr: ctx.acwr,
      exercise: ex,
      profile,
    },
  });
}
