// IndexedDB schema for the local-first store. The on-device system of record: the
// app boots and a full workout is logged from here with zero network.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Exercise, ExerciseOverride, LoggedSet, Profile, Recommendation, Workout } from './domain';
import type { SessionTarget } from '../lib/target';
import type { WeeklySummary } from '../lib/weeklySummary';

/** A queued mutation awaiting idempotent replay to the remote (Supabase). */
export type SyncOp =
  | { seq?: number; kind: 'workout'; payload: Workout }
  | { seq?: number; kind: 'set'; payload: LoggedSet }
  | { seq?: number; kind: 'recommendation'; payload: Recommendation }
  | { seq?: number; kind: 'outcome'; payload: { id: string; accepted: boolean; outcome: Recommendation['actual_outcome'] } }
  | { seq?: number; kind: 'profile'; payload: Profile }
  | { seq?: number; kind: 'exercise'; payload: Exercise }
  | { seq?: number; kind: 'override'; payload: ExerciseOverride }
  | { seq?: number; kind: 'delete-set'; payload: { id: string } };

/** Local storage row for a per-user machine override (composite key). */
export interface OverrideRow extends ExerciseOverride {
  key: string; // `${user_id}::${exercise_id}`
}

export interface NextSessionRow {
  key: string; // `${user_id}::${exercise_id}`
  user_id: string;
  exercise_id: string;
  target: SessionTarget;
}

export interface AliasRow {
  exercise_id: string;
  aliases: string[];
}

/** A generated weekly summary (WEEKLY_SUMMARY.md). Device-local view — derived
 *  from synced sessions, so it's regenerable and doesn't itself sync. One row per
 *  user per week; re-generating replaces it (idempotent). */
export interface WeeklySummaryRow {
  key: string; // `${user_id}::${week_start}`
  user_id: string;
  week_start: string; // Monday yyyy-mm-dd — sorts chronologically as a string
  summary: WeeklySummary;
}

export interface PODB extends DBSchema {
  exercises: { key: string; value: Exercise };
  aliases: { key: string; value: AliasRow };
  workouts: { key: string; value: Workout; indexes: { by_user: string } };
  sets: { key: string; value: LoggedSet; indexes: { by_workout: string; by_exercise: string } };
  profiles: { key: string; value: Profile };
  recommendations: { key: string; value: Recommendation; indexes: { by_user: string } };
  next_sessions: { key: string; value: NextSessionRow };
  overrides: { key: string; value: OverrideRow; indexes: { by_user: string } };
  sync_queue: { key: number; value: SyncOp };
  weekly_summaries: { key: string; value: WeeklySummaryRow; indexes: { by_user: string } };
}

export type PODatabase = IDBPDatabase<PODB>;

export function openPODB(name = 'progressive-overload'): Promise<PODatabase> {
  return openDB<PODB>(name, 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('exercises', { keyPath: 'id' });
        db.createObjectStore('aliases', { keyPath: 'exercise_id' });

        const workouts = db.createObjectStore('workouts', { keyPath: 'id' });
        workouts.createIndex('by_user', 'user_id');

        const sets = db.createObjectStore('sets', { keyPath: 'id' });
        sets.createIndex('by_workout', 'workout_id');
        sets.createIndex('by_exercise', 'exercise_id');

        db.createObjectStore('profiles', { keyPath: 'user_id' });

        const recs = db.createObjectStore('recommendations', { keyPath: 'id' });
        recs.createIndex('by_user', 'user_id');

        db.createObjectStore('next_sessions', { keyPath: 'key' });
        db.createObjectStore('sync_queue', { keyPath: 'seq', autoIncrement: true });
      }
      if (oldVersion < 2) {
        // INCREMENTS.md — per-user machine overrides.
        const overrides = db.createObjectStore('overrides', { keyPath: 'key' });
        overrides.createIndex('by_user', 'user_id');
      }
      if (oldVersion < 3) {
        // WEEKLY_SUMMARY.md — device-local generated readouts, browsable history.
        const ws = db.createObjectStore('weekly_summaries', { keyPath: 'key' });
        ws.createIndex('by_user', 'user_id');
      }
    },
  });
}
