// Interim target derivation for the Log Set screen.
//
// For now this simply repeats the last session's top working set (a sane, honest
// default for a logging loop). The full evidence-based recommendation from
// progression.ts gets wired in at step 9, once the feature pipeline (step 7)
// supplies the ACWR / fatigue context that engine needs. The shape it returns is
// exactly what the real recommendation will, so swapping is a one-line change.

import { repRangeForGoal, targetRIRForGoal } from './progression';
import { e1RM, effectiveLoad, loggedFromEffective } from './effectiveLoad';
import { snapToLoadable } from './rounding';
import type { Equipment, Exercise, Goal, Profile } from './types';

export interface SessionTarget {
  target_weight_lb: number;
  target_reps: number;
  target_sets: number;
  rationale?: string;
}

interface TargetSet {
  weight_lb: number;
  reps: number;
  is_warmup?: boolean;
  failed?: boolean;
}
interface TargetSession {
  sets: TargetSet[];
}

const STARTING_WEIGHT_LB: Record<Equipment, number> = {
  barbell: 45,
  dumbbell: 10,
  kettlebell: 25,
  machine_selectorized: 30,
  machine_plate: 25,
  cable: 20,
  bodyweight: 0,
  band: 0,
};

/** Heaviest non-warmup set of a session, ties broken by reps. */
function topWorkingSet(session: TargetSession): TargetSet | null {
  const working = session.sets.filter((s) => !s.is_warmup);
  if (working.length === 0) return null;
  return working.reduce((a, b) => {
    if (b.weight_lb !== a.weight_lb) return b.weight_lb > a.weight_lb ? b : a;
    return b.reps > a.reps ? b : a;
  });
}

export function deriveInitialTarget(
  history: TargetSession[],
  exercise: { equipment: Equipment; is_compound: boolean },
  goal: Goal,
): SessionTarget {
  // Bottom of the goal's evidence-based rep range — where double progression
  // starts, so there's maximal room to add reps before load. NEVER a magic 8.
  const { min: startingReps } = repRangeForGoal(goal, exercise.is_compound);

  // Walk back to the most recent session that actually had working sets.
  for (let i = history.length - 1; i >= 0; i--) {
    const top = topWorkingSet(history[i]!);
    if (top) {
      const workingSets = history[i]!.sets.filter((s) => !s.is_warmup).length;
      return {
        target_weight_lb: top.weight_lb,
        target_reps: top.reps,
        target_sets: Math.max(1, workingSets),
        rationale: 'Repeating your last session. Full recommendation lands once the feature pipeline is wired.',
      };
    }
  }
  return {
    target_weight_lb: STARTING_WEIGHT_LB[exercise.equipment],
    target_reps: startingReps,
    target_sets: 3,
    rationale: `First time logging this lift — pick a weight you can control for ${startingReps} reps, the bottom of your ${goal} range.`,
  };
}

type SeedExercise = Pick<
  Exercise,
  'equipment' | 'load_type' | 'default_increment_lb' | 'weight_increment_lb' | 'weight_stack_min_lb'
> & { is_compound: boolean };
type SeedProfile = Pick<Profile, 'bodyweight_lb' | 'has_micro_plates' | 'dumbbell_increment_lb' | 'plate_system'>;

/**
 * Cold-start seed (audit fix #5): turn a recent set the user *remembers* into a
 * loadable starting prescription, so a brand-new exercise doesn't open on the
 * crude equipment default (an empty 45-lb bar for a 315-lb squatter).
 *
 * Report → e1RM (Epley on effective load) → working load that leaves the goal's
 * target RIR in reserve at the bottom of the rep range → back to logged weight →
 * snapped to the loadable grid. This is only a prescription: it is NEVER written
 * as a logged set. The user's first real set replaces it with true history.
 */
export function seedTargetFromRepMax(
  reported: { weight_lb: number; reps: number },
  exercise: SeedExercise,
  user: SeedProfile,
  goal: Goal,
): SessionTarget {
  const { min: startingReps } = repRangeForGoal(goal, exercise.is_compound);
  const rir = targetRIRForGoal(goal);
  const reportedE1RM = e1RM(effectiveLoad(reported, exercise, user), reported.reps);
  // Working load that leaves `rir` reps in reserve at the starting rep count.
  const targetEffective = reportedE1RM / (1 + (startingReps + rir) / 30);
  const logged = loggedFromEffective(targetEffective, exercise, user);
  const weight = snapToLoadable(logged, exercise, user, 'nearest');
  return {
    target_weight_lb: weight,
    target_reps: startingReps,
    target_sets: 3,
    rationale: `Estimated from ${reported.weight_lb} × ${reported.reps}. This is a starting point, not logged history — your first real set replaces it.`,
  };
}
