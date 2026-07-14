import { describe, expect, it } from 'vitest';
import { LocalFirstStore, DEMO_LOCAL_USER } from './localStore';
import type { RemoteSync } from './remoteSync';
import { CONFIG_VERSION } from '../lib/evidenceConfig';
import type { RemoteSource } from './remoteSource';
import { seedExercises } from './seedCatalog';
import type { ExerciseOverride, LoggedSet, OutcomeJson, Profile, Recommendation, Workout } from './domain';

const dbName = () => `test-${crypto.randomUUID()}`;
const U = 'user-1';

class MockRemote implements RemoteSync {
  workouts = new Map<string, Workout>();
  sets = new Map<string, LoggedSet>();
  recs = new Map<string, Recommendation>();
  profiles = new Map<string, Profile>();
  calls = 0;
  fail = false;
  async pushWorkout(w: Workout) { this.guard(); this.workouts.set(w.id, w); }
  async pushSet(s: LoggedSet) { this.guard(); this.sets.set(s.id, s); }
  async pushRecommendation(r: Recommendation) { this.guard(); this.recs.set(r.id, r); }
  async pushOutcome() { this.guard(); }
  async pushProfile(p: Profile) { this.guard(); this.profiles.set(p.user_id, p); }
  async pushExercise() { this.guard(); }
  overrides = new Map<string, ExerciseOverride>();
  async pushOverride(o: ExerciseOverride) { this.guard(); this.overrides.set(`${o.user_id}::${o.exercise_id}`, o); }
  async deleteSet() { this.guard(); }
  private guard() { if (this.fail) throw new Error('offline'); this.calls++; }
}

describe('LocalFirstStore — reads are local', () => {
  it('seeds the offline catalog and its aliases', async () => {
    const store = new LocalFirstStore({ dbName: dbName() });
    const list = await store.listExercises(U);
    expect(list.length).toBeGreaterThanOrEqual(8);
    const searchable = await store.listSearchable(U);
    expect(searchable.find((e) => e.id === 'barbell-back-squat')!.aliases).toContain('bb squat');
  });

  it('preloads demo history when seedDemo is set', async () => {
    const store = new LocalFirstStore({ dbName: dbName(), seedDemo: true });
    const history = await store.getExerciseHistory(DEMO_LOCAL_USER, 'barbell-back-squat');
    expect(history).toHaveLength(10);
  });
});

describe('local-write-first durability (airplane mode + reopen)', () => {
  it('a logged set survives a store re-open with no network', async () => {
    const name = dbName();
    const s1 = new LocalFirstStore({ dbName: name }); // no remote — fully offline
    const w = await s1.startWorkout(U);
    await s1.logSet({ workout_id: w.id, exercise_id: 'barbell-bench-press', set_number: 1, weight_lb: 185, reps: 5, rir: 2, is_warmup: false, failed: false });
    await s1.logSet({ workout_id: w.id, exercise_id: 'barbell-bench-press', set_number: 2, weight_lb: 185, reps: 5, rir: 1, is_warmup: false, failed: false });

    // Simulate killing and reopening the app: brand-new store, same IndexedDB.
    const s2 = new LocalFirstStore({ dbName: name });
    const history = await s2.getExerciseHistory(U, 'barbell-bench-press');
    expect(history).toHaveLength(1);
    expect(history[0]!.sets.map((s) => s.weight_lb)).toEqual([185, 185]);
  });
});

describe('clearing a logged set', () => {
  const logInput = (id: string) => ({
    id, workout_id: '', exercise_id: 'lat-pulldown', set_number: 1,
    weight_lb: 120, reps: 10, rir: 2, is_warmup: false, failed: false,
  });

  it('removes the set locally and cancels its un-synced create', async () => {
    const store = new LocalFirstStore({ dbName: dbName(), remote: new MockRemote() });
    const w = await store.startWorkout(U);
    await store.logSet({ ...logInput('set-x'), workout_id: w.id });
    expect(await store.pendingSyncCount()).toBe(2); // workout + set

    await store.deleteSet('set-x');
    expect(await store.getExerciseHistory(U, 'lat-pulldown')).toHaveLength(0);
    expect(await store.pendingSyncCount()).toBe(1); // create canceled, no delete op needed
  });

  it('queues a delete for a set that already synced', async () => {
    const store = new LocalFirstStore({ dbName: dbName(), remote: new MockRemote() });
    const w = await store.startWorkout(U);
    await store.logSet({ ...logInput('set-y'), workout_id: w.id });
    await store.flush();
    expect(await store.pendingSyncCount()).toBe(0);

    await store.deleteSet('set-y');
    expect(await store.pendingSyncCount()).toBe(1); // a delete-set op
    expect(await store.flush()).toBe(1);
  });
});

describe('per-machine overrides (INCREMENTS.md)', () => {
  it('stores an override locally and syncs it to the remote', async () => {
    const remote = new MockRemote();
    const store = new LocalFirstStore({ dbName: dbName(), remote });
    await store.setOverride(U, 'cable-row', { weight_increment_lb: 7, weight_stack_min_lb: 21 });

    const local = await store.getOverrides(U);
    expect(local).toEqual([
      { user_id: U, exercise_id: 'cable-row', weight_increment_lb: 7, weight_stack_min_lb: 21 },
    ]);

    await store.flush();
    expect(remote.overrides.get(`${U}::cable-row`)).toMatchObject({ weight_increment_lb: 7, weight_stack_min_lb: 21 });
  });

  it('scopes overrides to the user', async () => {
    const store = new LocalFirstStore({ dbName: dbName() });
    await store.setOverride(U, 'a', { weight_increment_lb: 5, weight_stack_min_lb: null });
    await store.setOverride('other-user', 'b', { weight_increment_lb: 9, weight_stack_min_lb: null });
    expect((await store.getOverrides(U)).map((o) => o.exercise_id)).toEqual(['a']);
  });
});

describe('precomputed next-session cache is keyed by goal (audit fix #5)', () => {
  const target = { target_weight_lb: 225, target_reps: 5, target_sets: 3 };

  it('a goal change cannot serve a stale cached target', async () => {
    const store = new LocalFirstStore({ dbName: dbName() });
    // Precompute written while the user was on the strength goal.
    await store.saveNextSession(U, 'squat', target, 'strength');
    expect(await store.getNextSession(U, 'squat', 'strength')).toEqual(target);
    // After switching to hypertrophy, the old-goal entry is unreachable by key —
    // the read misses and the caller falls through to a live recompute.
    expect(await store.getNextSession(U, 'squat', 'hypertrophy')).toBeNull();
  });
});

describe('evidence-config version stamping (EVIDENCE_CONFIG.md)', () => {
  it('records the active config version on every recommendation', async () => {
    const remote = new MockRemote();
    const store = new LocalFirstStore({ dbName: dbName(), remote });
    const id = await store.saveRecommendation({
      user_id: U, exercise_id: 'barbell-back-squat', target_weight_lb: 225, target_reps: 5,
      target_sets: 3, confidence: 0.5, rationale: 'increase', alpha: 0, rule_pred_e1rm: 260, ml_pred_e1rm: null,
    });
    await store.flush();
    expect(remote.recs.get(id)?.config_version).toBe(CONFIG_VERSION);
  });
});

describe('plateau breaker resolution logging (FEATURES.md #5)', () => {
  it('records the chosen resolution on the recommendation and syncs it to the ML layer', async () => {
    const remote = new MockRemote();
    const store = new LocalFirstStore({ dbName: dbName(), remote });
    const id = await store.saveRecommendation({
      user_id: U, exercise_id: 'barbell-back-squat', target_weight_lb: 225, target_reps: 5,
      target_sets: 3, confidence: 0.5, rationale: 'repeat', alpha: 0, rule_pred_e1rm: 260, ml_pred_e1rm: null,
    });
    await store.recordPlateauChoice(id, 'rep_range_shift');
    await store.flush();
    expect(remote.recs.get(id)?.plateau_choice).toBe('rep_range_shift');
  });
});

describe('idempotent background sync', () => {
  it('drains the queue once and never double-pushes on replay', async () => {
    const remote = new MockRemote();
    const store = new LocalFirstStore({ dbName: dbName(), remote });
    const w = await store.startWorkout(U);
    await store.logSet({ workout_id: w.id, exercise_id: 'lat-pulldown', set_number: 1, weight_lb: 120, reps: 10, rir: 2, is_warmup: false, failed: false });

    expect(await store.pendingSyncCount()).toBe(2); // workout + set

    expect(await store.flush()).toBe(2);
    expect(remote.workouts.size).toBe(1);
    expect(remote.sets.size).toBe(1);
    expect(await store.pendingSyncCount()).toBe(0);

    // Replaying flush pushes nothing more (queue already drained).
    const callsAfterFirst = remote.calls;
    expect(await store.flush()).toBe(0);
    expect(remote.calls).toBe(callsAfterFirst);
    expect(remote.sets.size).toBe(1); // still exactly one row
  });

  it('keeps ops queued when the remote is unreachable (retry later)', async () => {
    const remote = new MockRemote();
    remote.fail = true;
    const store = new LocalFirstStore({ dbName: dbName(), remote });
    const w = await store.startWorkout(U);
    await store.logSet({ workout_id: w.id, exercise_id: 'lat-pulldown', set_number: 1, weight_lb: 120, reps: 10, rir: 2, is_warmup: false, failed: false });

    expect(await store.flush()).toBe(0); // still offline
    expect(await store.pendingSyncCount()).toBe(2); // nothing lost

    remote.fail = false; // connection returns
    expect(await store.flush()).toBe(2);
    expect(await store.pendingSyncCount()).toBe(0);
  });

  it('a store with no remote (demo/offline) never loses the queue', async () => {
    const store = new LocalFirstStore({ dbName: dbName() });
    await store.startWorkout(U);
    expect(await store.flush()).toBe(0);
    expect(await store.pendingSyncCount()).toBe(1);
  });
});

describe('user-created exercises', () => {
  it('persists an owner-scoped exercise, lists it, and queues it for sync', async () => {
    const remote = new MockRemote();
    const store = new LocalFirstStore({ dbName: dbName(), remote });
    const ex = await store.createExercise(U, {
      name: 'Cable Y-Raise', movement_pattern: 'isolation', equipment: 'cable', load_type: 'total',
      is_compound: false, is_unilateral: false, default_increment_lb: 5, fatigue_cost: 2,
      primary_muscles: ['side_delts'],
    });
    expect(ex.is_system).toBe(false);
    expect(ex.owner_id).toBe(U);
    expect(ex.slug).toMatch(/^cable-y-raise-/);

    const listed = await store.listExercises(U);
    expect(listed.some((e) => e.id === ex.id)).toBe(true);
    // survives a re-open and syncs
    expect(await store.flush()).toBeGreaterThanOrEqual(1);
  });
});

describe('precomputed next session', () => {
  it('persists across a re-open and reads without any remote call', async () => {
    const name = dbName();
    const remote = new MockRemote();
    const s1 = new LocalFirstStore({ dbName: name, remote });
    await s1.saveNextSession(U, 'barbell-back-squat', { target_weight_lb: 235, target_reps: 3, target_sets: 3, rationale: 'x' }, 'strength');

    const s2 = new LocalFirstStore({ dbName: name, remote });
    const next = await s2.getNextSession(U, 'barbell-back-squat', 'strength');
    expect(next!.target_weight_lb).toBe(235);
    expect(remote.calls).toBe(0); // reading the prescription touched no network
  });
});

class MockSource implements RemoteSource {
  constructor(
    private workouts: Workout[] = [],
    private sets: LoggedSet[] = [],
    private profile: Profile | null = null,
  ) {}
  pulls = 0;
  async pullExercises() { this.pulls++; return seedExercises(); }
  async pullWorkouts() { this.pulls++; return this.workouts; }
  async pullSets() { this.pulls++; return this.sets; }
  async pullRecommendations() { this.pulls++; return [] as Recommendation[]; }
  async pullProfile() { this.pulls++; return this.profile; }
}

describe('remote → local hydration (returning user, new device)', () => {
  const w: Workout = { id: 'w-remote', user_id: U, performed_at: '2026-02-01T00:00:00Z', notes: null, session_rpe: 8, sleep_quality: null, soreness: null, energy: null, readiness_score: null };
  const s: LoggedSet = { id: 's-remote', workout_id: 'w-remote', exercise_id: 'barbell-deadlift', set_number: 1, weight_lb: 315, reps: 5, rir: 2, is_warmup: false, failed: false, tempo: null, pain: null };

  it('pulls the server truth into an empty local store', async () => {
    const source = new MockSource([w], [s], null);
    const store = new LocalFirstStore({ dbName: dbName(), source });
    await store.hydrate(U);
    const history = await store.getExerciseHistory(U, 'barbell-deadlift');
    expect(history).toHaveLength(1);
    expect(history[0]!.sets[0]!.weight_lb).toBe(315);
  });

  it('is idempotent and never deletes local-only rows', async () => {
    const source = new MockSource([w], [s], null);
    const store = new LocalFirstStore({ dbName: dbName(), source });

    // A set logged offline that the server hasn't seen yet.
    const local = await store.startWorkout(U);
    await store.logSet({ workout_id: local.id, exercise_id: 'lat-pulldown', set_number: 1, weight_lb: 120, reps: 10, rir: 2, is_warmup: false, failed: false });

    await store.hydrate(U);
    await store.hydrate(U); // twice — must not duplicate

    expect(await store.getExerciseHistory(U, 'barbell-deadlift')).toHaveLength(1); // pulled once
    expect(await store.getExerciseHistory(U, 'lat-pulldown')).toHaveLength(1); // local survives
  });

  it('no-ops without a source (demo/offline)', async () => {
    const store = new LocalFirstStore({ dbName: dbName() });
    await store.hydrate(U); // should not throw
    expect(await store.getAllSessions(U)).toEqual([]);
  });
});

describe('feedback loop persistence', () => {
  it('records an outcome and exports it for the nightly job', async () => {
    const store = new LocalFirstStore({ dbName: dbName() });
    const id = await store.saveRecommendation({
      user_id: U, exercise_id: 'barbell-bench-press', target_weight_lb: 205, target_reps: 3,
      target_sets: 3, confidence: 0.6, rationale: 'inc', alpha: 0.3, rule_pred_e1rm: 226, ml_pred_e1rm: 240,
    });
    const outcome: OutcomeJson = { actual_e1rm: 233, actual_top_weight: 205, actual_reps: 3, completed: true };
    await store.recordOutcome(id, true, outcome);
    const rows = await store.exportOutcomes(U);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ rule_pred_e1rm: 226, ml_pred_e1rm: 240, actual_e1rm: 233 });
  });
});
