// Supabase-backed WorkoutStore. A thin shell over the pure mappers; RLS on the
// server scopes every query to the signed-in user, so these methods don't filter
// by user_id themselves (except where a query spans tables).
//
// NOTE: not exercised against a live database in this environment — the logic is
// straightforward and the mappers it relies on are unit-tested, but the SQL
// round-trips are unverified here. First integration step when a project exists.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SearchableExercise } from '../lib/exerciseSearch';
import type { AliasRow, ExerciseRow, ProfileRow, SetRow, WorkoutRow } from './dbTypes';
import {
  buildAliasList,
  defaultProfile,
  groupAllSessions,
  groupSetsIntoSessions,
  rowToExercise,
  rowToProfile,
  rowToSet,
  rowToWorkout,
} from './mappers';
import type {
  AllSession,
  CreateExerciseInput,
  Exercise,
  LoggedSession,
  OutcomeJson,
  PlateauChoice,
  OutcomeRow,
  Profile,
  Workout,
  WorkoutCheckin,
} from './domain';
import { slugify } from '../lib/newExercise';
import type { LogSetInput, SaveRecommendationInput, WorkoutStore } from './store';

export class SupabaseWorkoutStore implements WorkoutStore {
  constructor(private readonly db: SupabaseClient) {}

  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await this.db
      .from('user_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToProfile(data as ProfileRow) : defaultProfile(userId);
  }

  async upsertProfile(userId: string, patch: Partial<Profile>): Promise<Profile> {
    const { data, error } = await this.db
      .from('user_profile')
      .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) throw error;
    return rowToProfile(data as ProfileRow);
  }

  async listExercises(_userId: string): Promise<Exercise[]> {
    const { data, error } = await this.db.from('exercises').select('*').order('name');
    if (error) throw error;
    return (data as ExerciseRow[]).map(rowToExercise);
  }

  async listSearchable(_userId: string): Promise<SearchableExercise[]> {
    const [ex, aliases] = await Promise.all([
      this.db.from('exercises').select('id,name'),
      this.db.from('exercise_aliases').select('exercise_id,alias'),
    ]);
    if (ex.error) throw ex.error;
    if (aliases.error) throw aliases.error;
    const aliasMap = buildAliasList(aliases.data as AliasRow[]);
    return (ex.data as { id: string; name: string }[]).map((e) => ({
      id: e.id,
      name: e.name,
      aliases: aliasMap.get(e.id) ?? [],
    }));
  }

  async createExercise(userId: string, input: CreateExerciseInput): Promise<Exercise> {
    const { data, error } = await this.db
      .from('exercises')
      .insert({
        slug: `${slugify(input.name)}-${Date.now().toString(36)}`,
        name: input.name.trim(),
        movement_pattern: input.movement_pattern,
        primary_muscles: input.primary_muscles,
        secondary_muscles: [],
        equipment: input.equipment,
        load_type: input.load_type,
        is_unilateral: input.is_unilateral,
        is_compound: input.is_compound,
        default_increment_lb: input.default_increment_lb,
        fatigue_cost: input.fatigue_cost,
        is_system: false,
        owner_id: userId,
      })
      .select('*')
      .single();
    if (error) throw error;
    return rowToExercise(data as ExerciseRow);
  }

  async getExerciseHistory(userId: string, exerciseId: string): Promise<LoggedSession[]> {
    const { data: workoutRows, error: wErr } = await this.db
      .from('workouts')
      .select('*')
      .eq('user_id', userId);
    if (wErr) throw wErr;
    const workouts = new Map<string, Workout>(
      (workoutRows as WorkoutRow[]).map((w) => [w.id, rowToWorkout(w)]),
    );
    if (workouts.size === 0) return [];

    const { data: setRows, error: sErr } = await this.db
      .from('sets')
      .select('*')
      .eq('exercise_id', exerciseId)
      .in('workout_id', [...workouts.keys()]);
    if (sErr) throw sErr;

    return groupSetsIntoSessions((setRows as SetRow[]).map(rowToSet), workouts);
  }

  async getAllSessions(userId: string): Promise<AllSession[]> {
    const { data: workoutRows, error: wErr } = await this.db
      .from('workouts')
      .select('*')
      .eq('user_id', userId);
    if (wErr) throw wErr;
    const workouts = new Map<string, Workout>(
      (workoutRows as WorkoutRow[]).map((w) => [w.id, rowToWorkout(w)]),
    );
    if (workouts.size === 0) return [];

    const { data: setRows, error: sErr } = await this.db
      .from('sets')
      .select('*')
      .in('workout_id', [...workouts.keys()]);
    if (sErr) throw sErr;
    return groupAllSessions((setRows as SetRow[]).map(rowToSet), workouts);
  }

  async startWorkout(userId: string, performedAt?: string, checkin?: WorkoutCheckin): Promise<Workout> {
    const { data, error } = await this.db
      .from('workouts')
      .insert({
        user_id: userId,
        performed_at: performedAt ?? new Date().toISOString(),
        sleep_quality: checkin?.sleep_quality ?? null,
        soreness: checkin?.soreness ?? null,
        energy: checkin?.energy ?? null,
        readiness_score: checkin?.readiness_score ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return rowToWorkout(data as WorkoutRow);
  }

  async logSet(input: LogSetInput): Promise<void> {
    const { error } = await this.db.from('sets').insert({ tempo: null, ...input });
    if (error) throw error;
  }

  async deleteSet(setId: string): Promise<void> {
    const { error } = await this.db.from('sets').delete().eq('id', setId);
    if (error) throw error;
  }

  async finishWorkout(
    workoutId: string,
    patch?: { notes?: string; session_rpe?: number | null },
  ): Promise<void> {
    if (!patch) return;
    const { error } = await this.db.from('workouts').update(patch).eq('id', workoutId);
    if (error) throw error;
  }

  async saveRecommendation(input: SaveRecommendationInput): Promise<string> {
    const { data, error } = await this.db
      .from('recommendations')
      .insert(input)
      .select('id')
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  }

  async recordOutcome(
    recommendationId: string,
    accepted: boolean,
    outcome: OutcomeJson,
  ): Promise<void> {
    const { error } = await this.db
      .from('recommendations')
      .update({ accepted, actual_outcome: outcome })
      .eq('id', recommendationId);
    if (error) throw error;
  }

  async recordPlateauChoice(recommendationId: string, choice: PlateauChoice): Promise<void> {
    const { error } = await this.db
      .from('recommendations')
      .update({ plateau_choice: choice })
      .eq('id', recommendationId);
    if (error) throw error;
  }

  async exportOutcomes(userId: string): Promise<OutcomeRow[]> {
    const { data, error } = await this.db
      .from('recommendations')
      .select('user_id,exercise_id,generated_at,rule_pred_e1rm,ml_pred_e1rm,actual_outcome')
      .eq('user_id', userId)
      .not('actual_outcome', 'is', null)
      .order('generated_at');
    if (error) throw error;
    return (data as Array<{
      user_id: string;
      exercise_id: string;
      generated_at: string;
      rule_pred_e1rm: number | null;
      ml_pred_e1rm: number | null;
      actual_outcome: OutcomeJson | null;
    }>).map((r) => ({
      user_id: r.user_id,
      exercise_id: r.exercise_id,
      performed_at: r.generated_at,
      rule_pred_e1rm: r.rule_pred_e1rm,
      ml_pred_e1rm: r.ml_pred_e1rm,
      actual_e1rm: r.actual_outcome?.actual_e1rm ?? null,
    }));
  }
}
