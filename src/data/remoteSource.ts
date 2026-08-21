// The READ side of sync (pull), used to hydrate a fresh device's local store from
// Supabase. Complements RemoteSync (push). Order on login: flush() local pending
// first, then hydrate() — so a pull never clobbers an un-pushed local write.

import type { SupabaseClient } from '@supabase/supabase-js';
import { buildAliasList, rowToExercise, rowToProfile, rowToSet, rowToWorkout } from './mappers';
import type { AliasRow, ExerciseRow, ProfileRow, SetRow, WorkoutRow } from './dbTypes';
import type { Exercise, LoggedSet, Profile, Recommendation, Workout, Gym } from './domain';

export interface RemoteSource {
  pullExercises(): Promise<{ exercises: Exercise[]; aliases: Map<string, string[]> }>;
  pullWorkouts(userId: string): Promise<Workout[]>;
  pullSets(userId: string): Promise<LoggedSet[]>;
  pullRecommendations(userId: string): Promise<Recommendation[]>;
  pullProfile(userId: string): Promise<Profile | null>;
  /** MULTI_GYM.md — without this the client invents its own home gym and the
   *  server's "one home per user" index rejects it, wedging the sync queue. */
  pullGyms(userId: string): Promise<Gym[]>;
}

/**
 * Supabase-backed pull. NOTE: not exercised against a live database in this
 * environment (same caveat as the rest of the Supabase layer) — the queries are
 * standard but the round-trips are unverified here.
 */
export class SupabaseRemoteSource implements RemoteSource {
  constructor(private readonly db: SupabaseClient) {}

  async pullExercises(): Promise<{ exercises: Exercise[]; aliases: Map<string, string[]> }> {
    const [ex, al] = await Promise.all([
      this.db.from('exercises').select('*'),
      this.db.from('exercise_aliases').select('exercise_id,alias'),
    ]);
    if (ex.error) throw ex.error;
    if (al.error) throw al.error;
    return {
      exercises: (ex.data as ExerciseRow[]).map(rowToExercise),
      aliases: buildAliasList(al.data as AliasRow[]),
    };
  }

  async pullWorkouts(userId: string): Promise<Workout[]> {
    const { data, error } = await this.db.from('workouts').select('*').eq('user_id', userId);
    if (error) throw error;
    return (data as WorkoutRow[]).map(rowToWorkout);
  }

  async pullSets(userId: string): Promise<LoggedSet[]> {
    const { data: wrows, error: wErr } = await this.db.from('workouts').select('id').eq('user_id', userId);
    if (wErr) throw wErr;
    const ids = (wrows as { id: string }[]).map((w) => w.id);
    if (ids.length === 0) return [];
    const { data, error } = await this.db.from('sets').select('*').in('workout_id', ids);
    if (error) throw error;
    return (data as SetRow[]).map(rowToSet);
  }

  async pullRecommendations(userId: string): Promise<Recommendation[]> {
    const { data, error } = await this.db.from('recommendations').select('*').eq('user_id', userId);
    if (error) throw error;
    return data as Recommendation[];
  }

  async pullGyms(userId: string): Promise<Gym[]> {
    const { data, error } = await this.db.from('gyms').select('*').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []) as Gym[];
  }

  async pullProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.db.from('user_profile').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data ? rowToProfile(data as ProfileRow) : null;
  }
}
