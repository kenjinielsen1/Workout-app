// Airplane-mode end-to-end guard (audit fix #3b). Locks the foundation the
// gym-floor premise rests on: a full multi-exercise session logs offline, its
// next-set targets stay correct throughout AND after an app kill, and the queue
// syncs every set exactly once on reconnect. Pure integration — no production
// code changes; if this ever fails, that failure is the finding.

import { describe, expect, it } from 'vitest';
import { LocalFirstStore } from './localStore';
import type { RemoteSync } from './remoteSync';
import type { Exercise, LoggedSet, Profile, Recommendation, Workout, ExerciseOverride } from './domain';
import { recommendTarget } from '../lib/recommend';
import { nextSetTarget } from '../lib/liveProgression';
import { isLoadable } from '../lib/rounding';
import type { FeatureExercise } from '../lib/features';
import type { ProgProfile } from '../lib/progression';

const U = 'gymrat';
const dbName = () => `test-${crypto.randomUUID()}`;

/** A network that throws while offline, then records exactly-once on reconnect. */
class Network implements RemoteSync {
  online = false;
  workouts = new Map<string, Workout>();
  sets = new Map<string, LoggedSet>();
  recs = new Map<string, Recommendation>();
  profiles = new Map<string, Profile>();
  overrides = new Map<string, ExerciseOverride>();
  pushCalls = 0;
  private guard() { if (!this.online) throw new Error('offline'); this.pushCalls++; }
  async pushWorkout(w: Workout) { this.guard(); this.workouts.set(w.id, w); }
  async pushSet(s: LoggedSet) { this.guard(); this.sets.set(s.id, s); }
  async pushRecommendation(r: Recommendation) { this.guard(); this.recs.set(r.id, r); }
  async pushOutcome() { this.guard(); }
  async pushProfile(p: Profile) { this.guard(); this.profiles.set(p.user_id, p); }
  async pushExercise() { this.guard(); }
  async pushOverride(o: ExerciseOverride) { this.guard(); this.overrides.set(`${o.user_id}::${o.exercise_id}`, o); }
  async deleteSet() { this.guard(); }
}

const profile: ProgProfile = {
  bodyweight_lb: 185, has_micro_plates: true, dumbbell_increment_lb: 5, goal: 'hypertrophy', training_age_months: 24,
};

/** Log one working session (3 sets) for an exercise on a given date, offline. */
async function logSession(store: LocalFirstStore, exId: string, perf: string, weight: number, reps = 8) {
  const w = await store.startWorkout(U, perf);
  for (let n = 1; n <= 3; n++) {
    await store.logSet({ workout_id: w.id, exercise_id: exId, set_number: n, weight_lb: weight, reps, rir: 2, is_warmup: false, failed: false });
  }
}

const day = (n: number) => new Date(Date.UTC(2026, 5, 1 + n * 3)).toISOString();

describe('airplane-mode: a full session, offline, kill-proof, then idempotent sync', () => {
  it('logs multi-exercise offline with correct targets throughout, survives a kill, and syncs once', async () => {
    const net = new Network(); // OFFLINE
    const name = dbName();
    let store = new LocalFirstStore({ dbName: name, remote: net });

    const exercises = await store.listExercises(U);
    const index = new Map<string, FeatureExercise>(exercises.map((e) => [e.id, e as FeatureExercise]));
    const bench = index.get('barbell-bench-press')!;
    const squat = index.get('barbell-back-squat')!;

    // --- build history across two exercises, entirely offline ---
    await logSession(store, 'barbell-bench-press', day(0), 135);
    await logSession(store, 'barbell-bench-press', day(1), 140);
    await logSession(store, 'barbell-back-squat', day(0), 185);
    await logSession(store, 'barbell-back-squat', day(1), 195);

    // Flushing fails (offline) but every write is safe locally.
    expect(await store.flush()).toBe(0);
    expect(net.pushCalls).toBe(0);

    // --- next-set targets are correct THROUGHOUT, computed with zero network ---
    const all1 = await store.getAllSessions(U);
    const benchTarget = recommendTarget(all1, bench, index, profile)!;
    const squatTarget = recommendTarget(all1, squat, index, profile)!;
    expect(benchTarget).not.toBeNull();
    expect(isLoadable(benchTarget.target_weight_lb, bench, profile)).toBe(true);
    expect(isLoadable(squatTarget.target_weight_lb, squat, profile)).toBe(true);
    expect(benchTarget.target_weight_lb).toBeGreaterThanOrEqual(140); // progressed off the last session

    // Within-session live autoregulation is local too: beating the target bumps the next set.
    const live = nextSetTarget({
      currentWeight: benchTarget.target_weight_lb, targetReps: benchTarget.target_reps,
      last: { reps: benchTarget.target_reps + 2, rir: 3, failed: false }, exercise: bench, profile,
    });
    expect(live.weight_lb).toBeGreaterThan(benchTarget.target_weight_lb);

    // --- kill the app: brand-new store instance, same IndexedDB ---
    store = new LocalFirstStore({ dbName: name, remote: net });
    const all2 = await store.getAllSessions(U);
    expect(all2.length).toBe(all1.length); // every logged session survived

    // Targets are still correct after the reopen — identical inputs, identical output.
    const benchAfter = recommendTarget(await store.getAllSessions(U), bench, index, profile)!;
    expect(benchAfter.target_weight_lb).toBe(benchTarget.target_weight_lb);
    expect(isLoadable(benchAfter.target_weight_lb, bench, profile)).toBe(true);

    // --- reconnect: the queue drains, every set exactly once, no dupes/losses ---
    net.online = true;
    const flushed = await store.flush();
    expect(flushed).toBeGreaterThan(0);
    expect(net.workouts.size).toBe(4); // 4 sessions
    expect(net.sets.size).toBe(12); // 4 × 3 working sets, each pushed once
    const callsAfterFirst = net.pushCalls;
    expect(await store.flush()).toBe(0); // replay pushes nothing more
    expect(net.pushCalls).toBe(callsAfterFirst); // idempotent
  });
});
