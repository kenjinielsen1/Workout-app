// The sync target for the local-first store's queue. Every push is an UPSERT keyed
// by the client-generated id, so replaying the queue is idempotent — a set that was
// already synced simply overwrites itself (last-write-wins, single user/device).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Exercise, ExerciseOverride, OutcomeJson, Profile, Recommendation, Workout, LoggedSet } from './domain';

export interface RemoteSync {
  pushWorkout(w: Workout): Promise<void>;
  pushSet(s: LoggedSet): Promise<void>;
  pushRecommendation(r: Recommendation): Promise<void>;
  pushOutcome(id: string, accepted: boolean, outcome: OutcomeJson | null): Promise<void>;
  pushProfile(p: Profile): Promise<void>;
  pushExercise(e: Exercise): Promise<void>;
  pushOverride(o: ExerciseOverride): Promise<void>;
  deleteSet(id: string): Promise<void>;
}

/**
 * Supabase-backed sync. NOTE: not exercised against a live database in this
 * environment (same caveat as SupabaseWorkoutStore) — the upserts are standard but
 * the round-trips are unverified here.
 */
export class SupabaseRemoteSync implements RemoteSync {
  constructor(private readonly db: SupabaseClient) {}

  private async upsert(table: string, row: object, onConflict = 'id'): Promise<void> {
    const { error } = await this.db.from(table).upsert(row, { onConflict });
    if (error) throw error;
  }

  pushWorkout(w: Workout): Promise<void> {
    return this.upsert('workouts', {
      id: w.id, user_id: w.user_id, performed_at: w.performed_at,
      notes: w.notes, session_rpe: w.session_rpe,
      sleep_quality: w.sleep_quality, soreness: w.soreness,
      energy: w.energy, readiness_score: w.readiness_score,
    });
  }

  pushSet(s: LoggedSet): Promise<void> {
    return this.upsert('sets', {
      id: s.id, workout_id: s.workout_id, exercise_id: s.exercise_id, set_number: s.set_number,
      weight_lb: s.weight_lb, reps: s.reps, rir: s.rir, is_warmup: s.is_warmup,
      failed: s.failed, tempo: s.tempo,
    });
  }

  pushRecommendation(r: Recommendation): Promise<void> {
    return this.upsert('recommendations', {
      id: r.id, user_id: r.user_id, exercise_id: r.exercise_id, generated_at: r.generated_at,
      target_weight_lb: r.target_weight_lb, target_reps: r.target_reps, target_sets: r.target_sets,
      confidence: r.confidence, rationale: r.rationale, alpha: r.alpha,
      rule_pred_e1rm: r.rule_pred_e1rm, ml_pred_e1rm: r.ml_pred_e1rm,
      accepted: r.accepted, actual_outcome: r.actual_outcome,
      plateau_choice: r.plateau_choice,
    });
  }

  async pushOutcome(id: string, accepted: boolean, outcome: OutcomeJson | null): Promise<void> {
    const { error } = await this.db
      .from('recommendations')
      .update({ accepted, actual_outcome: outcome })
      .eq('id', id);
    if (error) throw error;
  }

  pushProfile(p: Profile): Promise<void> {
    return this.upsert('user_profile', { ...p }, 'user_id');
  }

  async deleteSet(id: string): Promise<void> {
    const { error } = await this.db.from('sets').delete().eq('id', id);
    if (error) throw error;
  }

  pushOverride(o: ExerciseOverride): Promise<void> {
    return this.upsert('user_exercise_overrides', {
      user_id: o.user_id, exercise_id: o.exercise_id,
      weight_increment_lb: o.weight_increment_lb, weight_stack_min_lb: o.weight_stack_min_lb,
    }, 'user_id,exercise_id');
  }

  pushExercise(e: Exercise): Promise<void> {
    // owner_id + is_system=false satisfy the exercise_write RLS with-check.
    return this.upsert('exercises', {
      id: e.id, slug: e.slug, name: e.name, movement_pattern: e.movement_pattern,
      primary_muscles: e.primary_muscles, secondary_muscles: e.secondary_muscles,
      equipment: e.equipment, load_type: e.load_type, is_unilateral: e.is_unilateral,
      is_compound: e.is_compound, default_increment_lb: e.default_increment_lb,
      fatigue_cost: e.fatigue_cost, is_system: e.is_system, owner_id: e.owner_id,
      variant_of: e.variant_of,
    });
  }
}
