// In-memory WorkoutStore — powers the demo (no Supabase env configured) and backs
// the data-layer tests. Fully synchronous under the hood; the async signatures just
// mirror the Supabase store so the two are drop-in interchangeable.

import type { SearchableExercise } from '../lib/exerciseSearch';
import { slugify } from '../lib/newExercise';
import { groupAllSessions, groupSetsIntoSessions } from './mappers';
import type {
  AllSession,
  CreateExerciseInput,
  Exercise,
  ExerciseOverride,
  LoggedSession,
  LoggedSet,
  OutcomeJson,
  PlateauChoice,
  OutcomeRow,
  Profile,
  Recommendation,
  Workout,
  WorkoutCheckin,
} from './domain';
import { PROFILE_DEFAULTS } from './dbTypes';
import { CONFIG_VERSION } from '../lib/evidenceConfig';
import type { LogSetInput, SaveRecommendationInput, WorkoutStore } from './store';

export const DEMO_USER_ID = 'demo-user';

type SeedExercise = Omit<Exercise, 'id' | 'is_system' | 'owner_id' | 'variant_of'> & {
  aliases: string[];
};

// A small curated catalog so the demo has real, searchable lifts without loading
// the full 143-entry seed. `id === slug` here for readability.
const SEED: SeedExercise[] = [
  { slug: 'barbell-back-squat', name: 'Barbell Back Squat', movement_pattern: 'squat', equipment: 'barbell', load_type: 'total', is_compound: true, is_unilateral: false, default_increment_lb: 10, fatigue_cost: 5, primary_muscles: ['quadriceps', 'glutes'], secondary_muscles: ['erectors'], aliases: ['back squat', 'bb squat', 'high bar squat', 'squat'] },
  { slug: 'barbell-bench-press', name: 'Barbell Bench Press', movement_pattern: 'horizontal_push', equipment: 'barbell', load_type: 'total', is_compound: true, is_unilateral: false, default_increment_lb: 5, fatigue_cost: 4, primary_muscles: ['pectorals', 'triceps'], secondary_muscles: ['front_delts'], aliases: ['bench press', 'bench', 'flat bench', 'bb bench'] },
  { slug: 'barbell-deadlift', name: 'Barbell Deadlift', movement_pattern: 'hinge', equipment: 'barbell', load_type: 'total', is_compound: true, is_unilateral: false, default_increment_lb: 10, fatigue_cost: 5, primary_muscles: ['glutes', 'hamstrings', 'erectors'], secondary_muscles: ['lats'], aliases: ['deadlift', 'conventional deadlift', 'dead', 'bb deadlift'] },
  { slug: 'barbell-overhead-press', name: 'Barbell Overhead Press', movement_pattern: 'vertical_push', equipment: 'barbell', load_type: 'total', is_compound: true, is_unilateral: false, default_increment_lb: 5, fatigue_cost: 4, primary_muscles: ['front_delts', 'side_delts'], secondary_muscles: ['triceps'], aliases: ['overhead press', 'ohp', 'strict press', 'military press'] },
  { slug: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', movement_pattern: 'horizontal_push', equipment: 'dumbbell', load_type: 'per_hand', is_compound: true, is_unilateral: false, default_increment_lb: 5, fatigue_cost: 3, primary_muscles: ['pectorals', 'triceps'], secondary_muscles: ['front_delts'], aliases: ['db bench', 'dumbbell bench', 'flat dumbbell press', 'db flat press'] },
  { slug: 'lat-pulldown', name: 'Lat Pulldown', movement_pattern: 'vertical_pull', equipment: 'cable', load_type: 'total', is_compound: true, is_unilateral: false, default_increment_lb: 10, fatigue_cost: 2, primary_muscles: ['lats', 'upper_back'], secondary_muscles: ['biceps'], aliases: ['lat pull down', 'pulldown', 'wide grip pulldown', 'cable pulldown'] },
  { slug: 'leg-press', name: 'Leg Press', movement_pattern: 'squat', equipment: 'machine_plate', load_type: 'per_side', is_compound: true, is_unilateral: false, default_increment_lb: 10, fatigue_cost: 3, primary_muscles: ['quadriceps', 'glutes'], secondary_muscles: ['hamstrings'], aliases: ['leg press machine', '45 degree leg press', 'sled press', 'plate leg press'] },
  { slug: 'dumbbell-curl', name: 'Dumbbell Curl', movement_pattern: 'isolation', equipment: 'dumbbell', load_type: 'per_hand', is_compound: false, is_unilateral: false, default_increment_lb: 5, fatigue_cost: 1, primary_muscles: ['biceps'], secondary_muscles: ['forearms'], aliases: ['db curl', 'bicep curl', 'standing dumbbell curl', 'dumbbell bicep curl'] },
];

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${(++counter).toString(36)}-${Date.now().toString(36)}`;

export class InMemoryWorkoutStore implements WorkoutStore {
  private exercises: Exercise[];
  private aliases = new Map<string, string[]>();
  private workouts = new Map<string, Workout>();
  private sets: LoggedSet[] = [];
  private profiles = new Map<string, Profile>();
  private recommendations = new Map<string, Recommendation>();
  private overrides = new Map<string, ExerciseOverride>();

  constructor() {
    this.exercises = SEED.map((s) => {
      const { aliases, ...rest } = s;
      this.aliases.set(s.slug, aliases);
      return { ...rest, id: s.slug, is_system: true, owner_id: null, variant_of: null };
    });
  }

  /** Seed a plausible progression so the demo's Exercise Detail isn't empty. */
  seedDemoHistory(userId = DEMO_USER_ID, exerciseId = 'barbell-back-squat'): void {
    const weeks: [number, number][] = [
      [185, 5], [190, 5], [195, 5], [195, 6], [205, 5],
      [210, 5], [205, 5], [215, 5], [220, 5], [225, 5],
    ];
    weeks.forEach(([w, reps], i) => {
      const id = nextId('wk');
      const performed_at = new Date(Date.UTC(2026, 3, 1 + i * 4)).toISOString();
      this.workouts.set(id, { id, user_id: userId, performed_at, notes: null, session_rpe: 7, sleep_quality: null, soreness: null, energy: null, readiness_score: null });
      const rows: Array<[number, number, number, boolean]> = [
        [w - 90, 5, 4, true],
        [w, reps, 2, false],
        [w, reps, 1, false],
        [w, reps - 1, 1, false],
      ];
      rows.forEach(([weight, r, rir, warm], n) => {
        this.sets.push({
          id: nextId('set'), workout_id: id, exercise_id: exerciseId, set_number: n + 1,
          weight_lb: weight, reps: r, rir, is_warmup: warm, failed: false, tempo: null, pain: null,
        });
      });
    });
  }

  async getProfile(userId: string): Promise<Profile> {
    return this.profiles.get(userId) ?? { user_id: userId, ...PROFILE_DEFAULTS, has_micro_plates: true, training_age_months: 18, bodyweight_lb: 185, goal: 'hypertrophy' };
  }

  async upsertProfile(userId: string, patch: Partial<Profile>): Promise<Profile> {
    const current = await this.getProfile(userId);
    const next = { ...current, ...patch, user_id: userId };
    this.profiles.set(userId, next);
    return next;
  }

  async listExercises(userId: string): Promise<Exercise[]> {
    return this.exercises.filter((e) => e.is_system || e.owner_id === userId);
  }

  async getOverrides(userId: string): Promise<ExerciseOverride[]> {
    return [...this.overrides.values()].filter((o) => o.user_id === userId);
  }

  async setOverride(
    userId: string,
    exerciseId: string,
    patch: Pick<ExerciseOverride, 'weight_increment_lb' | 'weight_stack_min_lb'>,
  ): Promise<void> {
    this.overrides.set(`${userId}::${exerciseId}`, {
      user_id: userId,
      exercise_id: exerciseId,
      weight_increment_lb: patch.weight_increment_lb ?? null,
      weight_stack_min_lb: patch.weight_stack_min_lb ?? null,
    });
  }

  async listSearchable(userId: string): Promise<SearchableExercise[]> {
    const list = await this.listExercises(userId);
    return list.map((e) => ({ id: e.id, name: e.name, aliases: this.aliases.get(e.id) ?? [] }));
  }

  async createExercise(userId: string, input: CreateExerciseInput): Promise<Exercise> {
    const id = nextId('ex');
    const exercise: Exercise = {
      id, slug: `${slugify(input.name)}-${id.slice(-6)}`, name: input.name.trim(),
      movement_pattern: input.movement_pattern, equipment: input.equipment, load_type: input.load_type,
      is_compound: input.is_compound, is_unilateral: input.is_unilateral,
      default_increment_lb: input.default_increment_lb, fatigue_cost: input.fatigue_cost,
      primary_muscles: input.primary_muscles, secondary_muscles: [],
      is_system: false, owner_id: userId, variant_of: null,
    };
    this.exercises.push(exercise);
    this.aliases.set(id, []);
    return exercise;
  }

  async getExerciseHistory(userId: string, exerciseId: string): Promise<LoggedSession[]> {
    const userWorkouts = new Map(
      [...this.workouts.values()].filter((w) => w.user_id === userId).map((w) => [w.id, w]),
    );
    const sets = this.sets.filter((s) => s.exercise_id === exerciseId && userWorkouts.has(s.workout_id));
    return groupSetsIntoSessions(sets, userWorkouts);
  }

  async getAllSessions(userId: string): Promise<AllSession[]> {
    const userWorkouts = new Map(
      [...this.workouts.values()].filter((w) => w.user_id === userId).map((w) => [w.id, w]),
    );
    const sets = this.sets.filter((s) => userWorkouts.has(s.workout_id));
    return groupAllSessions(sets, userWorkouts);
  }

  async startWorkout(userId: string, performedAt?: string, checkin?: WorkoutCheckin): Promise<Workout> {
    const w: Workout = {
      id: nextId('wk'),
      user_id: userId,
      performed_at: performedAt ?? new Date().toISOString(),
      notes: null,
      session_rpe: null,
      sleep_quality: checkin?.sleep_quality ?? null,
      soreness: checkin?.soreness ?? null,
      energy: checkin?.energy ?? null,
      readiness_score: checkin?.readiness_score ?? null,
    };
    this.workouts.set(w.id, w);
    return w;
  }

  async logSet(input: LogSetInput): Promise<void> {
    this.sets.push({ ...input, id: input.id ?? nextId('set'), tempo: input.tempo ?? null, pain: input.pain ?? null });
  }

  async deleteSet(setId: string): Promise<void> {
    this.sets = this.sets.filter((s) => s.id !== setId);
  }

  async finishWorkout(
    workoutId: string,
    patch?: { notes?: string; session_rpe?: number | null },
  ): Promise<void> {
    const w = this.workouts.get(workoutId);
    if (!w) return;
    if (patch?.notes !== undefined) w.notes = patch.notes;
    if (patch?.session_rpe !== undefined) w.session_rpe = patch.session_rpe;
  }

  async saveRecommendation(input: SaveRecommendationInput): Promise<string> {
    const id = nextId('rec');
    this.recommendations.set(id, {
      id,
      generated_at: new Date().toISOString(),
      accepted: null,
      actual_outcome: null,
      plateau_choice: null,
      config_version: CONFIG_VERSION,
      ...input,
    });
    return id;
  }

  async recordOutcome(recommendationId: string, accepted: boolean, outcome: OutcomeJson): Promise<void> {
    const rec = this.recommendations.get(recommendationId);
    if (!rec) return;
    rec.accepted = accepted;
    rec.actual_outcome = outcome;
  }

  async recordPlateauChoice(recommendationId: string, choice: PlateauChoice): Promise<void> {
    const rec = this.recommendations.get(recommendationId);
    if (rec) rec.plateau_choice = choice;
  }

  async exportOutcomes(userId: string): Promise<OutcomeRow[]> {
    return [...this.recommendations.values()]
      .filter((r) => r.user_id === userId && r.actual_outcome?.actual_e1rm != null)
      .map((r) => ({
        user_id: r.user_id,
        exercise_id: r.exercise_id,
        performed_at: r.generated_at,
        rule_pred_e1rm: r.rule_pred_e1rm,
        ml_pred_e1rm: r.ml_pred_e1rm,
        actual_e1rm: r.actual_outcome!.actual_e1rm,
      }))
      .sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime());
  }
}

/** A demo store preloaded with catalog + squat history. */
export function createDemoStore(): InMemoryWorkoutStore {
  const store = new InMemoryWorkoutStore();
  store.seedDemoHistory();
  return store;
}
