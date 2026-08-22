import { describe, expect, it } from 'vitest';
import { LocalFirstStore, DEMO_LOCAL_USER } from './localStore';
import type { RemoteSync } from './remoteSync';
import { CONFIG_VERSION } from '../lib/evidenceConfig';
import type { RemoteSource } from './remoteSource';
import { seedExercises } from './seedCatalog';
import type { ExerciseOverride, LoggedSet, OutcomeJson, Profile, Recommendation, Workout, WorkoutTemplate, Gym, GymExerciseOverride } from './domain';

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
  templates = new Map<string, WorkoutTemplate>();
  async pushTemplate(t: WorkoutTemplate) { this.guard(); this.templates.set(t.id, t); }
  async deleteTemplate(id: string) { this.guard(); this.templates.delete(id); }
  gyms = new Map<string, Gym>();
  async pushGym(g: Gym) { this.guard(); this.gyms.set(g.id, g); }
  gymOverrides = new Map<string, GymExerciseOverride>();
  async pushGymOverride(o: GymExerciseOverride) { this.guard(); this.gymOverrides.set(`${o.gym_id}::${o.exercise_id}`, o); }
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
  async pullGyms(): Promise<Gym[]> { return []; }
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

describe('saved workouts — templates (SAVED_WORKOUTS.md)', () => {
  it('is fully usable offline: create, edit, reorder, delete with no remote', async () => {
    const store = new LocalFirstStore({ dbName: dbName() }); // no remote at all
    const t = await store.saveTemplate(U, { name: 'Push A', exercise_ids: ['bench', 'ohp', 'dip'] });
    expect(t.exercise_ids).toEqual(['bench', 'ohp', 'dip']);
    expect(await store.listTemplates(U)).toHaveLength(1);

    // Edit in place (rename + reorder) keeps the same id and created_at.
    const edited = await store.saveTemplate(U, { id: t.id, name: 'Push A2', exercise_ids: ['dip', 'bench', 'ohp'] });
    expect(edited.id).toBe(t.id);
    expect(edited.created_at).toBe(t.created_at);
    expect(edited.exercise_ids).toEqual(['dip', 'bench', 'ohp']);
    expect(await store.listTemplates(U)).toHaveLength(1); // replaced, not duplicated

    await store.deleteTemplate(t.id);
    expect(await store.listTemplates(U)).toEqual([]);
  });

  // The architectural rule: exercises + order, never weights/reps/sets.
  it('persists ONLY exercise ids and order — no weight, rep, or set data', async () => {
    const store = new LocalFirstStore({ dbName: dbName() });
    const t = await store.saveTemplate(U, { name: 'Legs', exercise_ids: ['squat', 'rdl'] });
    expect(Object.keys(t).sort()).toEqual(['created_at', 'exercise_ids', 'id', 'name', 'updated_at', 'user_id']);
    const serialized = JSON.stringify(t);
    for (const banned of ['weight', 'reps', 'sets', 'rir', 'target']) {
      expect(serialized.toLowerCase().includes(banned), `template leaked "${banned}"`).toBe(false);
    }
  });

  it('templates created offline sync idempotently on reconnect', async () => {
    const remote = new MockRemote();
    remote.fail = true; // offline
    const store = new LocalFirstStore({ dbName: dbName(), remote });
    const t = await store.saveTemplate(U, { name: 'Pull A', exercise_ids: ['row', 'curl'] });
    expect(await store.flush()).toBe(0); // nothing drains while offline
    expect(remote.templates.size).toBe(0);
    expect(await store.listTemplates(U)).toHaveLength(1); // still fully usable locally

    remote.fail = false; // reconnect
    expect(await store.flush()).toBeGreaterThan(0);
    expect(remote.templates.get(t.id)?.exercise_ids).toEqual(['row', 'curl']);

    // Replaying an already-drained queue changes nothing.
    const size = remote.templates.size;
    await store.flush();
    expect(remote.templates.size).toBe(size);
  });
});

describe('multi-gym (MULTI_GYM.md)', () => {
  it('calibrating a machine at gym B leaves gym A untouched', async () => {
    const store = new LocalFirstStore({ dbName: dbName() });
    const a = await store.ensureHomeGym(U);
    const b = await store.saveGym(U, { name: 'Hotel gym' });

    await store.setGymOverride(a.id, 'cable-row', { weight_increment_lb: 7, weight_stack_min_lb: 21 });
    await store.setGymOverride(b.id, 'cable-row', { weight_increment_lb: 15, weight_stack_min_lb: 30 });

    // Each building keeps its own measured step — the whole point of rule 1.
    expect(await store.getGymOverrides(a.id)).toEqual([
      { gym_id: a.id, exercise_id: 'cable-row', weight_increment_lb: 7, weight_stack_min_lb: 21 },
    ]);
    expect(await store.getGymOverrides(b.id)).toEqual([
      { gym_id: b.id, exercise_id: 'cable-row', weight_increment_lb: 15, weight_stack_min_lb: 30 },
    ]);
  });

  it('the home gym migrates legacy per-user calibration and equipment losslessly', async () => {
    const name = dbName();
    const store = new LocalFirstStore({ dbName: name });
    // Pre-gym state: a calibrated machine + the user's equipment settings.
    await store.upsertProfile(U, { has_micro_plates: false, dumbbell_increment_lb: 10, plate_system: 'metric' });
    await store.setOverride(U, 'leg-press', { weight_increment_lb: 12, weight_stack_min_lb: 40 });

    const home = await store.ensureHomeGym(U);
    expect(home.is_home).toBe(true);
    // Equipment settings carried onto the gym…
    expect(home).toMatchObject({ has_micro_plates: false, dumbbell_increment_lb: 10, plate_system: 'metric' });
    // …and the measured machine step is not lost.
    expect(await store.getGymOverrides(home.id)).toEqual([
      { gym_id: home.id, exercise_id: 'leg-press', weight_increment_lb: 12, weight_stack_min_lb: 40 },
    ]);
    // Idempotent: re-running returns the same home gym, not a second one.
    expect((await store.ensureHomeGym(U)).id).toBe(home.id);
    expect((await store.listGyms(U)).filter((g) => g.is_home)).toHaveLength(1);
  });

  it('a session records which gym it happened at', async () => {
    const store = new LocalFirstStore({ dbName: dbName() });
    const b = await store.saveGym(U, { name: 'Hotel gym' });
    const w = await store.startWorkout(U, undefined, undefined, b.id);
    await store.logSet({ workout_id: w.id, exercise_id: 'leg-press', set_number: 1, weight_lb: 200, reps: 10, rir: 2, is_warmup: false, failed: false });
    const sessions = await store.getAllSessions(U);
    expect(sessions.find((s) => s.exercise_id === 'leg-press')?.gym_id).toBe(b.id);
  });

  it('deleting a gym preserves its logged sets — history is never orphaned', async () => {
    const store = new LocalFirstStore({ dbName: dbName() });
    const b = await store.saveGym(U, { name: 'Hotel gym' });
    const w = await store.startWorkout(U, undefined, undefined, b.id);
    await store.logSet({ workout_id: w.id, exercise_id: 'leg-press', set_number: 1, weight_lb: 200, reps: 10, rir: 2, is_warmup: false, failed: false });

    await store.deleteGym(b.id);
    expect(await store.listGyms(U)).not.toContainEqual(expect.objectContaining({ id: b.id }));
    const sessions = await store.getAllSessions(U);
    expect(sessions.find((s) => s.exercise_id === 'leg-press')?.sets).toHaveLength(1); // sets survive
  });
});

describe('next-session cache is keyed by GYM too (MULTI_GYM.md)', () => {
  const target = { target_weight_lb: 400, target_reps: 8, target_sets: 3 };

  it('a precomputed target from one gym is never served at another', async () => {
    const store = new LocalFirstStore({ dbName: dbName() });
    const a = await store.ensureHomeGym(U);
    const b = await store.saveGym(U, { name: 'Hotel gym' });

    // Precomputed at the home gym's leg press.
    await store.saveNextSession(U, 'leg-press', target, 'hypertrophy', a.id);
    expect(await store.getNextSession(U, 'leg-press', 'hypertrophy', a.id)).toEqual(target);
    // At the other gym the key misses → the caller recomputes (and cold-starts).
    expect(await store.getNextSession(U, 'leg-press', 'hypertrophy', b.id)).toBeNull();
  });
});

describe('gym attribution survives a server hydrate (MULTI_GYM.md)', () => {
  it('rowToWorkout keeps gym_id — without it, away sessions silently become home', async () => {
    const { rowToWorkout } = await import('./mappers');
    const w = rowToWorkout({
      id: 'w1', user_id: U, performed_at: '2026-08-01T18:00:00Z', gym_id: 'gym-away',
      notes: null, session_rpe: 8, sleep_quality: null, soreness: null, energy: null, readiness_score: null,
    });
    expect(w.gym_id).toBe('gym-away');
  });

  it('a legacy row with no gym_id maps to null, not undefined', async () => {
    const { rowToWorkout } = await import('./mappers');
    const w = rowToWorkout({
      id: 'w2', user_id: U, performed_at: '2026-08-01T18:00:00Z',
      notes: null, session_rpe: null, sleep_quality: null, soreness: null, energy: null, readiness_score: null,
    });
    expect(w.gym_id).toBeNull();
  });
});

// One permanently-rejected op used to wedge the whole queue via `break`, so a
// single bad row held every logged set hostage — indefinitely.
describe('a poisoned sync op cannot block the queue', () => {
  class PickyRemote extends MockRemote {
    /** Simulates a Postgres constraint violation: has a `code`, never succeeds. */
    override async pushGym(): Promise<void> {
      const err = new Error('duplicate key value violates unique constraint') as Error & { code: string };
      err.code = '23505';
      throw err;
    }
  }

  it('skips the rejected op and syncs everything behind it', async () => {
    const remote = new PickyRemote();
    const store = new LocalFirstStore({ dbName: dbName(), remote });

    // A gym the server will always reject, then real training data behind it.
    await store.saveGym(U, { name: 'Duplicate home' });
    const w = await store.startWorkout(U);
    await store.logSet({ workout_id: w.id, exercise_id: 'barbell-bench-press', set_number: 1, weight_lb: 185, reps: 5, rir: 2, is_warmup: false, failed: false });

    await store.flush();
    // The sets got through despite the poisoned gym op ahead of them.
    expect(remote.workouts.size).toBe(1);
    expect(remote.sets.size).toBe(1);
    expect(store.blockedSyncCount).toBe(1); // and we know something is stuck
  });

  it('a transient failure still stops the run, so nothing is skipped while offline', async () => {
    const remote = new MockRemote();
    remote.fail = true; // plain Error, no code → offline
    const store = new LocalFirstStore({ dbName: dbName(), remote });
    const w = await store.startWorkout(U);
    await store.logSet({ workout_id: w.id, exercise_id: 'barbell-bench-press', set_number: 1, weight_lb: 185, reps: 5, rir: 2, is_warmup: false, failed: false });

    expect(await store.flush()).toBe(0);
    expect(store.blockedSyncCount).toBe(0); // nothing written off as permanent

    remote.fail = false;
    expect(await store.flush()).toBeGreaterThan(0); // and it all lands on reconnect
  });
});

describe('the client adopts the server\'s gyms rather than inventing its own', () => {
  it('hydrate stores server gyms, so ensureHomeGym finds the existing home', async () => {
    const serverHome = {
      id: 'server-home', user_id: U, name: 'Home gym', is_home: true,
      has_micro_plates: true, dumbbell_increment_lb: 5, plate_system: 'imperial' as const,
      created_at: '2026-08-01T00:00:00Z',
    };
    class SourceWithGyms extends MockSource {
      override async pullGyms() { return [serverHome]; }
    }
    const store = new LocalFirstStore({ dbName: dbName(), source: new SourceWithGyms() });
    await store.hydrate(U);

    const home = await store.ensureHomeGym(U);
    expect(home.id).toBe('server-home'); // adopted, not a fresh uuid
    expect((await store.listGyms(U)).filter((g) => g.is_home)).toHaveLength(1);
  });
});

// The real-world cascade: a client that invented its own home gym before it had
// seen the server's. The duplicate is rejected forever, every workout logged
// against it then fails the gyms foreign key, and its sets go down with it.
describe('repairing a home gym the client invented (MULTI_GYM.md)', () => {
  const serverHome = {
    id: 'server-home', user_id: U, name: 'Home gym', is_home: true,
    has_micro_plates: true, dumbbell_increment_lb: 5, plate_system: 'imperial' as const,
    created_at: '2026-08-01T00:00:00Z',
  };
  class SourceWithHome extends MockSource {
    override async pullGyms(): Promise<Gym[]> { return [serverHome]; }
  }

  it('remaps the sessions, fixes the queued payloads, and drops the duplicate', async () => {
    const remote = new MockRemote();
    const store = new LocalFirstStore({ dbName: dbName(), remote, source: new SourceWithHome() });

    // Before the server was ever seen: a locally-minted home gym, trained against.
    const invented = await store.ensureHomeGym(U);
    expect(invented.id).not.toBe(serverHome.id);
    await store.setGymOverride(invented.id, 'cable-row', { weight_increment_lb: 11, weight_stack_min_lb: null });
    const w = await store.startWorkout(U, undefined, undefined, invented.id);
    await store.logSet({ workout_id: w.id, exercise_id: 'cable-row', set_number: 1, weight_lb: 100, reps: 10, rir: 2, is_warmup: false, failed: false });

    await store.hydrate(U);

    // Exactly one home gym, and it's the server's.
    const gyms = await store.listGyms(U);
    expect(gyms.filter((g) => g.is_home).map((g) => g.id)).toEqual([serverHome.id]);
    // The session moved with it — history is not orphaned.
    const sessions = await store.getAllSessions(U);
    expect(sessions.find((x) => x.exercise_id === 'cable-row')?.gym_id).toBe(serverHome.id);
    // The measured machine step came along too.
    expect(await store.getGymOverrides(serverHome.id)).toContainEqual(
      expect.objectContaining({ exercise_id: 'cable-row', weight_increment_lb: 11 }),
    );

    // And the queue now drains — the workout carries a gym the server really has.
    await store.flush();
    expect(remote.workouts.get(w.id)?.gym_id).toBe(serverHome.id);
    expect(remote.sets.size).toBe(1); // the training data finally lands
  });

  it('leaves genuine away gyms alone and is safe to re-run', async () => {
    const store = new LocalFirstStore({ dbName: dbName(), source: new SourceWithHome() });
    await store.ensureHomeGym(U);
    const away = await store.saveGym(U, { name: 'Hotel gym' }); // not home — keep it

    await store.hydrate(U);
    await store.hydrate(U); // idempotent

    const gyms = await store.listGyms(U);
    expect(gyms.map((g) => g.id).sort()).toEqual([away.id, serverHome.id].sort());
  });
});

// Reported from the device: gym-override · 42501 (RLS). The override's gym must
// exist server-side and be yours, so an op pointing at a discarded gym is refused
// on every flush, forever.
describe('orphaned gym-override ops cannot wedge the queue', () => {
  const serverHome = {
    id: 'server-home', user_id: U, name: 'Home gym', is_home: true,
    has_micro_plates: true, dumbbell_increment_lb: 5, plate_system: 'imperial' as const,
    created_at: '2026-08-01T00:00:00Z',
  };
  class SourceWithHome extends MockSource {
    override async pullGyms(): Promise<Gym[]> { return [serverHome]; }
  }

  it('the repair leaves no override pointing at the discarded gym', async () => {
    const remote = new MockRemote();
    const store = new LocalFirstStore({ dbName: dbName(), remote, source: new SourceWithHome() });

    const invented = await store.ensureHomeGym(U);
    await store.setGymOverride(invented.id, 'cable-row', { weight_increment_lb: 11, weight_stack_min_lb: null });

    await store.hydrate(U);
    await store.flush();

    // Every override that reached the server names a gym the server actually has.
    for (const o of remote.gymOverrides.values()) expect(o.gym_id).toBe(serverHome.id);
    // And the calibration itself survived the move.
    expect([...remote.gymOverrides.values()]).toContainEqual(
      expect.objectContaining({ exercise_id: 'cable-row', weight_increment_lb: 11 }),
    );
    expect(store.blockedSyncCount).toBe(0); // nothing left stuck
  });

  it('prunes an override whose gym is gone, without touching valid ones', async () => {
    const store = new LocalFirstStore({ dbName: dbName(), source: new SourceWithHome() });
    await store.hydrate(U); // adopt the server's home gym
    await store.setGymOverride(serverHome.id, 'cable-row', { weight_increment_lb: 5, weight_stack_min_lb: null });
    await store.setGymOverride('vanished-gym', 'leg-press', { weight_increment_lb: 9, weight_stack_min_lb: null });

    await store.hydrate(U); // the repair runs again

    const remote = new MockRemote();
    await store.flush(remote);
    const gymIds = [...remote.gymOverrides.values()].map((o) => o.gym_id);
    expect(gymIds).toContain(serverHome.id); // the real one still syncs
    expect(gymIds).not.toContain('vanished-gym'); // the orphan is gone
  });
});
