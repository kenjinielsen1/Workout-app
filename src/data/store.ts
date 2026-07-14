// The seam between the UI and persistence. Screens depend only on this interface,
// so the in-memory store (demo / tests) and the Supabase store are interchangeable.

import type { SearchableExercise } from '../lib/exerciseSearch';
import type { PainType } from '../lib/safety';
import type {
  AllSession,
  CreateExerciseInput,
  Exercise,
  ExerciseOverride,
  LoggedSession,
  OutcomeJson,
  PlateauChoice,
  OutcomeRow,
  Profile,
  Workout,
  WorkoutCheckin,
} from './domain';

export interface SaveRecommendationInput {
  user_id: string;
  exercise_id: string;
  target_weight_lb: number;
  target_reps: number;
  target_sets: number;
  confidence: number;
  rationale: string;
  alpha: number;
  rule_pred_e1rm: number | null;
  ml_pred_e1rm: number | null;
}

export interface LogSetInput {
  id?: string; // client-generated; lets the caller delete it later
  workout_id: string;
  exercise_id: string;
  set_number: number;
  weight_lb: number;
  reps: number;
  rir: number | null;
  is_warmup: boolean;
  failed: boolean;
  tempo?: string | null;
  pain?: PainType | null;
}

export interface WorkoutStore {
  /** The signed-in user's profile (defaults applied if no row exists yet). */
  getProfile(userId: string): Promise<Profile>;
  upsertProfile(userId: string, patch: Partial<Profile>): Promise<Profile>;

  /** System catalog plus the user's own exercises. */
  listExercises(userId: string): Promise<Exercise[]>;

  /** Name + aliases for fuzzy search / duplicate detection. */
  listSearchable(userId: string): Promise<SearchableExercise[]>;

  /** Create a user-owned exercise (is_system=false, owner_id=userId). */
  createExercise(userId: string, input: CreateExerciseInput): Promise<Exercise>;

  /** One exercise's full logged history, oldest-first, for stats + recommendations. */
  getExerciseHistory(userId: string, exerciseId: string): Promise<LoggedSession[]>;

  /** Every session across all exercises (for movement-pattern ACWR + ML features). */
  getAllSessions(userId: string): Promise<AllSession[]>;

  /** Per-user machine increment/min overrides (INCREMENTS.md). */
  getOverrides(userId: string): Promise<ExerciseOverride[]>;
  setOverride(userId: string, exerciseId: string, patch: Pick<ExerciseOverride, 'weight_increment_lb' | 'weight_stack_min_lb'>): Promise<void>;

  /** Open (or reuse) a workout to log sets into. Optional session-start check-in
   *  (FEATURES.md #2) is stored on the workout. */
  startWorkout(userId: string, performedAt?: string, checkin?: WorkoutCheckin): Promise<Workout>;
  logSet(input: LogSetInput): Promise<void>;
  /** Remove a logged set (local + queued delete to the backend). */
  deleteSet(setId: string): Promise<void>;
  finishWorkout(
    workoutId: string,
    patch?: { notes?: string; session_rpe?: number | null },
  ): Promise<void>;

  // --- feedback loop (step 10) ---
  /** Persist a generated recommendation; returns its id for later outcome logging. */
  saveRecommendation(input: SaveRecommendationInput): Promise<string>;
  /** Record whether the recommendation was accepted and what actually happened. */
  recordOutcome(recommendationId: string, accepted: boolean, outcome: OutcomeJson): Promise<void>;
  /** Log the plateau-breaker resolution the user chose (FEATURES.md #5). */
  recordPlateauChoice(recommendationId: string, choice: PlateauChoice): Promise<void>;
  /** Flattened rows (recs with a realized outcome) for the nightly evaluate job. */
  exportOutcomes(userId: string): Promise<OutcomeRow[]>;
}
