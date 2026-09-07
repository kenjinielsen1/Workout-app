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
  // Name the cause plainly. A retrain that just says "exit code 1" tells whoever
  // reads the weekly failure email nothing at all.
  for (const [name, r] of [['exercises', ex], ['workouts', wk], ['sets', st], ['user_profile', pr]] as const) {
    if (!r.error) continue;
    const e = r.error as { code?: string; message?: string; hint?: string };
    console.error(`Reading "${name}" failed${e.code ? ` (${e.code})` : ''}: ${e.message ?? r.error}`);
    if (e.code === 'PGRST303') {
      // The legacy service_role key is a JWT; PostgREST refuses it when its "issued
      // at" claim sits ahead of the server clock. A new-format secret key is not a
      // JWT at all, so it has no iat and this cannot recur.
      console.error(
        'The key was rejected for its "issued at" claim, not its permissions.\n' +
        'Replace the SUPABASE_SERVICE_ROLE_KEY repo secret with a new-format\n' +
        'secret key (sb_secret_…) from Supabase → Settings → API Keys. Those are\n' +
        'not JWTs, so they carry no timestamp to fall out of sync.',
      );
    } else if (e.code === 'PGRST301' || /jwt|api key|unauthor/i.test(e.message ?? '')) {
      console.error(
        'This looks like an auth failure. If the project moved to the new API keys,\n' +
        'the legacy service_role JWT is disabled — create a secret key (sb_secret_…)\n' +
        'and update the SUPABASE_SERVICE_ROLE_KEY repo secret.',
      );
    }
    process.exit(1);
  }

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
