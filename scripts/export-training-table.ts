/**
 * Export a training table from Supabase for the ML retrain job.
 *
 * Reads every user's logged workouts/sets with the SERVICE ROLE key (bypasses RLS
 * — this runs server-side only, never in the browser), reruns the tested TS feature
 * pipeline (buildTrainingTable), and writes rows train.py can consume:
 *   [{ "features": [ …51 ], "label_e1rm": number, "label_completed": 0|1 }, …]
 *
 * Usage: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *          tsx scripts/export-training-table.ts [out.json]
 */
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  defaultProfile,
  groupAllSessions,
  rowToExercise,
  rowToProfile,
  rowToSet,
  rowToWorkout,
} from '../src/data/mappers';
import type { ExerciseRow, ProfileRow, SetRow, WorkoutRow } from '../src/data/dbTypes';
import type { Workout } from '../src/data/domain';
import { buildTrainingTable, type FeatureExercise, type FeatureSession } from '../src/lib/features';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const out = process.argv[2] ?? 'training_table.json';
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const [ex, wk, st, pr] = await Promise.all([
    db.from('exercises').select('*'),
    db.from('workouts').select('*'),
    db.from('sets').select('*'),
    db.from('user_profile').select('*'),
  ]);
  for (const r of [ex, wk, st, pr]) if (r.error) throw r.error;

  const index = new Map<string, FeatureExercise>(
    (ex.data as ExerciseRow[]).map(rowToExercise).map((e) => [e.id, e]),
  );
  const workouts = (wk.data as WorkoutRow[]).map(rowToWorkout);
  const sets = (st.data as SetRow[]).map(rowToSet);
  const profiles = new Map((pr.data as ProfileRow[]).map((p) => [p.user_id, rowToProfile(p)]));

  // Group per user, then run the pooled feature pipeline (attribute-based, so all
  // users' rows train one model — SPEC).
  const workoutsByUser = new Map<string, Workout[]>();
  for (const w of workouts) {
    const list = workoutsByUser.get(w.user_id) ?? [];
    list.push(w);
    workoutsByUser.set(w.user_id, list);
  }

  const rows: { features: number[]; label_e1rm: number; label_completed: number | null }[] = [];
  for (const [userId, userWorkouts] of workoutsByUser) {
    const wmap = new Map(userWorkouts.map((w) => [w.id, w]));
    const userSets = sets.filter((s) => wmap.has(s.workout_id));
    const sessions: FeatureSession[] = groupAllSessions(userSets, wmap);
    const profile = profiles.get(userId) ?? defaultProfile(userId);
    for (const r of buildTrainingTable(userId, sessions, index, profile)) {
      rows.push({ features: r.features, label_e1rm: r.label_e1rm, label_completed: r.label_completed });
    }
  }

  writeFileSync(out, JSON.stringify(rows));
  console.log(`Wrote ${rows.length} training rows to ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
