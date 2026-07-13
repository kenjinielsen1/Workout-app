// Local-first WorkoutStore (OFFLINE_FIRST.md). IndexedDB is the system of record:
// every read is local (no network on the recommendation/live path), every write
// lands locally first and enqueues an idempotent sync op. A logged set survives
// airplane mode, an app kill, and a dead zone.
//
// Reconciliation with Supabase is deferred: `flush(remote)` drains the queue when a
// connection exists, upserting by client-generated UUID so replay never duplicates.

import type { SearchableExercise } from '../lib/exerciseSearch';
import type { SessionTarget } from '../lib/target';
import { openPODB, type PODatabase, type SyncOp } from './idb';
import { groupAllSessions, groupSetsIntoSessions } from './mappers';
import { PROFILE_DEFAULTS } from './dbTypes';
import { demoHistory, seedExercises } from './seedCatalog';
import type {
  AllSession, CreateExerciseInput, Exercise, ExerciseOverride, LoggedSession, LoggedSet, OutcomeJson, OutcomeRow, Profile, Recommendation, PlateauChoice, Workout, WorkoutCheckin,
} from './domain';
import { slugify } from '../lib/newExercise';
import type { LogSetInput, SaveRecommendationInput, WorkoutStore } from './store';
import type { RemoteSync } from './remoteSync';
import type { RemoteSource } from './remoteSource';

export const DEMO_LOCAL_USER = 'demo-user';

const uuid = (): string =>
  (globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}-${Date.now()}`);

interface LocalStoreOptions {
  dbName?: string;
  remote?: RemoteSync | null;
  source?: RemoteSource | null;
  /** Seed the demo catalog + squat history on first run (no backend). */
  seedDemo?: boolean;
}

export class LocalFirstStore implements WorkoutStore {
  private db!: PODatabase;
  private readonly ready: Promise<void>;
  private readonly remote: RemoteSync | null;
  private readonly source: RemoteSource | null;
  private readonly seedDemo: boolean;
  private flushing = false;

  constructor(opts: LocalStoreOptions = {}) {
    this.remote = opts.remote ?? null;
    this.source = opts.source ?? null;
    this.seedDemo = opts.seedDemo ?? false;
    this.ready = this.init(opts.dbName);
  }

  private async putCatalog(exercises: Exercise[], aliases: Map<string, string[]>): Promise<void> {
    const tx = this.db.transaction(['exercises', 'aliases'], 'readwrite');
    for (const e of exercises) void tx.objectStore('exercises').put(e);
    for (const [exercise_id, list] of aliases) void tx.objectStore('aliases').put({ exercise_id, aliases: list });
    await tx.done;
  }

  private async init(dbName?: string): Promise<void> {
    this.db = await openPODB(dbName);
    // Seed the reference catalog. In Supabase mode the SERVER owns it (real UUID
    // ids), so pull it now — logging against the bundled slug-id catalog would
    // produce sets with non-UUID exercise_ids that Postgres rejects. In demo /
    // offline-only mode, use the bundled catalog (id = slug).
    if ((await this.db.count('exercises')) === 0) {
      if (this.source) {
        try {
          const { exercises, aliases } = await this.source.pullExercises();
          await this.putCatalog(exercises, aliases);
        } catch {
          // Offline on first run — leave empty; hydrate() fills it once connected.
        }
      } else {
        const { exercises, aliases } = seedExercises();
        await this.putCatalog(exercises, aliases);
      }
    }
    if (this.seedDemo && (await this.db.count('workouts')) === 0) {
      const { workouts, sets } = demoHistory(DEMO_LOCAL_USER);
      const tx = this.db.transaction(['workouts', 'sets'], 'readwrite');
      for (const w of workouts) void tx.objectStore('workouts').put(w);
      for (const s of sets) void tx.objectStore('sets').put(s);
      await tx.done;
    }
  }

  private async enqueue(op: SyncOp): Promise<void> {
    await this.db.add('sync_queue', op);
  }

  // --- reads (all local) ----------------------------------------------------
  async getProfile(userId: string): Promise<Profile> {
    await this.ready;
    const p = await this.db.get('profiles', userId);
    return p ?? { user_id: userId, ...PROFILE_DEFAULTS, has_micro_plates: true, training_age_months: 18, bodyweight_lb: 185, goal: 'hypertrophy' };
  }

  async upsertProfile(userId: string, patch: Partial<Profile>): Promise<Profile> {
    await this.ready;
    const next: Profile = { ...(await this.getProfile(userId)), ...patch, user_id: userId };
    await this.db.put('profiles', next);
    await this.enqueue({ kind: 'profile', payload: next });
    return next;
  }

  async listExercises(userId: string): Promise<Exercise[]> {
    await this.ready;
    const all = await this.db.getAll('exercises');
    return all.filter((e) => e.is_system || e.owner_id === userId);
  }

  async getOverrides(userId: string): Promise<ExerciseOverride[]> {
    await this.ready;
    const rows = await this.db.getAllFromIndex('overrides', 'by_user', userId);
    return rows.map(({ key: _key, ...o }) => o);
  }

  async setOverride(
    userId: string,
    exerciseId: string,
    patch: Pick<ExerciseOverride, 'weight_increment_lb' | 'weight_stack_min_lb'>,
  ): Promise<void> {
    await this.ready;
    const override: ExerciseOverride = {
      user_id: userId,
      exercise_id: exerciseId,
      weight_increment_lb: patch.weight_increment_lb ?? null,
      weight_stack_min_lb: patch.weight_stack_min_lb ?? null,
    };
    await this.db.put('overrides', { key: `${userId}::${exerciseId}`, ...override });
    await this.enqueue({ kind: 'override', payload: override });
  }

  async listSearchable(userId: string): Promise<SearchableExercise[]> {
    await this.ready;
    const list = await this.listExercises(userId);
    return Promise.all(
      list.map(async (e) => ({ id: e.id, name: e.name, aliases: (await this.db.get('aliases', e.id))?.aliases ?? [] })),
    );
  }

  async createExercise(userId: string, input: CreateExerciseInput): Promise<Exercise> {
    await this.ready;
    const id = uuid();
    const exercise: Exercise = {
      id,
      slug: `${slugify(input.name)}-${id.slice(0, 6)}`, // unique, won't collide with system slugs
      name: input.name.trim(),
      movement_pattern: input.movement_pattern,
      equipment: input.equipment,
      load_type: input.load_type,
      is_compound: input.is_compound,
      is_unilateral: input.is_unilateral,
      default_increment_lb: input.default_increment_lb,
      fatigue_cost: input.fatigue_cost,
      primary_muscles: input.primary_muscles,
      secondary_muscles: [],
      is_system: false,
      owner_id: userId,
      variant_of: null,
    };
    await this.db.put('exercises', exercise);
    await this.db.put('aliases', { exercise_id: id, aliases: [] });
    await this.enqueue({ kind: 'exercise', payload: exercise });
    return exercise;
  }

  private async userWorkouts(userId: string): Promise<Map<string, Workout>> {
    const rows = await this.db.getAllFromIndex('workouts', 'by_user', userId);
    return new Map(rows.map((w) => [w.id, w]));
  }

  async getExerciseHistory(userId: string, exerciseId: string): Promise<LoggedSession[]> {
    await this.ready;
    const workouts = await this.userWorkouts(userId);
    const sets = (await this.db.getAllFromIndex('sets', 'by_exercise', exerciseId)).filter((s) =>
      workouts.has(s.workout_id),
    );
    return groupSetsIntoSessions(sets, workouts);
  }

  async getAllSessions(userId: string): Promise<AllSession[]> {
    await this.ready;
    const workouts = await this.userWorkouts(userId);
    if (workouts.size === 0) return [];
    const sets = (await this.db.getAll('sets')).filter((s) => workouts.has(s.workout_id));
    return groupAllSessions(sets, workouts);
  }

  // --- writes (local-first, enqueue sync) -----------------------------------
  async startWorkout(userId: string, performedAt?: string, checkin?: WorkoutCheckin): Promise<Workout> {
    await this.ready;
    const w: Workout = {
      id: uuid(), user_id: userId, performed_at: performedAt ?? new Date().toISOString(),
      notes: null, session_rpe: null,
      sleep_quality: checkin?.sleep_quality ?? null,
      soreness: checkin?.soreness ?? null,
      energy: checkin?.energy ?? null,
      readiness_score: checkin?.readiness_score ?? null,
    };
    await this.db.put('workouts', w);
    await this.enqueue({ kind: 'workout', payload: w });
    return w;
  }

  async logSet(input: LogSetInput): Promise<void> {
    await this.ready;
    const s: LoggedSet = { ...input, id: input.id ?? uuid(), tempo: input.tempo ?? null };
    await this.db.put('sets', s);
    await this.enqueue({ kind: 'set', payload: s });
  }

  async deleteSet(setId: string): Promise<void> {
    await this.ready;
    await this.db.delete('sets', setId);
    // If its create op is still queued (never synced), cancel it — no round-trip
    // needed. Otherwise it's already on the server, so queue a delete.
    const ops = await this.db.getAll('sync_queue');
    const pendingCreate = ops.find((o) => o.kind === 'set' && o.payload.id === setId);
    if (pendingCreate?.seq !== undefined) {
      await this.db.delete('sync_queue', pendingCreate.seq);
    } else {
      await this.enqueue({ kind: 'delete-set', payload: { id: setId } });
    }
  }

  async finishWorkout(
    workoutId: string,
    patch?: { notes?: string; session_rpe?: number | null },
  ): Promise<void> {
    await this.ready;
    const w = await this.db.get('workouts', workoutId);
    if (!w) return;
    if (patch?.notes !== undefined) w.notes = patch.notes;
    if (patch?.session_rpe !== undefined) w.session_rpe = patch.session_rpe;
    await this.db.put('workouts', w);
    await this.enqueue({ kind: 'workout', payload: w });
  }

  async saveRecommendation(input: SaveRecommendationInput): Promise<string> {
    await this.ready;
    const rec: Recommendation = {
      id: uuid(), generated_at: new Date().toISOString(), accepted: null, actual_outcome: null, plateau_choice: null, ...input,
    };
    await this.db.put('recommendations', rec);
    await this.enqueue({ kind: 'recommendation', payload: rec });
    return rec.id;
  }

  async recordPlateauChoice(recommendationId: string, choice: PlateauChoice): Promise<void> {
    await this.ready;
    const rec = await this.db.get('recommendations', recommendationId);
    if (!rec) return;
    rec.plateau_choice = choice;
    await this.db.put('recommendations', rec);
    await this.enqueue({ kind: 'recommendation', payload: rec }); // re-push the full row
  }

  async recordOutcome(recommendationId: string, accepted: boolean, outcome: OutcomeJson): Promise<void> {
    await this.ready;
    const rec = await this.db.get('recommendations', recommendationId);
    if (!rec) return;
    rec.accepted = accepted;
    rec.actual_outcome = outcome;
    await this.db.put('recommendations', rec);
    await this.enqueue({ kind: 'outcome', payload: { id: recommendationId, accepted, outcome } });
  }

  async exportOutcomes(userId: string): Promise<OutcomeRow[]> {
    await this.ready;
    const recs = await this.db.getAllFromIndex('recommendations', 'by_user', userId);
    return recs
      .filter((r) => r.actual_outcome?.actual_e1rm != null)
      .map((r) => ({
        user_id: r.user_id, exercise_id: r.exercise_id, performed_at: r.generated_at,
        rule_pred_e1rm: r.rule_pred_e1rm, ml_pred_e1rm: r.ml_pred_e1rm,
        actual_e1rm: r.actual_outcome!.actual_e1rm,
      }))
      .sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime());
  }

  // --- precomputed "today's session" ---------------------------------------
  async saveNextSession(userId: string, exerciseId: string, target: SessionTarget): Promise<void> {
    await this.ready;
    await this.db.put('next_sessions', { key: `${userId}::${exerciseId}`, user_id: userId, exercise_id: exerciseId, target });
  }

  async getNextSession(userId: string, exerciseId: string): Promise<SessionTarget | null> {
    await this.ready;
    return (await this.db.get('next_sessions', `${userId}::${exerciseId}`))?.target ?? null;
  }

  // --- deferred sync --------------------------------------------------------
  /** Drain the queue to `remote` (or the injected one). Idempotent: an op that
   *  already synced upserts by id. Stops on the first failure, leaving the rest
   *  queued for the next attempt. Returns the number of ops flushed. */
  async flush(remote: RemoteSync | null = this.remote): Promise<number> {
    await this.ready;
    // Single-flight: overlapping flushes (e.g. after-write + on-reconnect) would
    // race the same queue; the guard makes them safe and cheap.
    if (!remote || this.flushing) return 0;
    this.flushing = true;
    let flushed = 0;
    try {
      const ops = await this.db.getAll('sync_queue');
      for (const op of ops) {
        try {
          switch (op.kind) {
            case 'workout': await remote.pushWorkout(op.payload); break;
            case 'set': await remote.pushSet(op.payload); break;
            case 'recommendation': await remote.pushRecommendation(op.payload); break;
            case 'outcome': await remote.pushOutcome(op.payload.id, op.payload.accepted, op.payload.outcome); break;
            case 'profile': await remote.pushProfile(op.payload); break;
            case 'exercise': await remote.pushExercise(op.payload); break;
            case 'override': await remote.pushOverride(op.payload); break;
            case 'delete-set': await remote.deleteSet(op.payload.id); break;
          }
          if (op.seq !== undefined) await this.db.delete('sync_queue', op.seq);
          flushed++;
        } catch {
          break; // still offline / transient error — keep the rest queued
        }
      }
    } finally {
      this.flushing = false;
    }
    return flushed;
  }

  async pendingSyncCount(): Promise<number> {
    await this.ready;
    return this.db.count('sync_queue');
  }

  /**
   * Pull the server's truth into the local store (a returning user on a new
   * device). Upsert-by-id, so it's idempotent and never deletes local-only rows.
   * Call flush() FIRST so un-pushed local writes aren't clobbered by an older
   * remote copy. No-op without a configured source (demo/offline).
   */
  async hydrate(userId: string, source: RemoteSource | null = this.source): Promise<void> {
    await this.ready;
    if (!source) return;
    const [{ exercises, aliases }, workouts, sets, recs, profile] = await Promise.all([
      source.pullExercises(),
      source.pullWorkouts(userId),
      source.pullSets(userId),
      source.pullRecommendations(userId),
      source.pullProfile(userId),
    ]);
    const tx = this.db.transaction(
      ['exercises', 'aliases', 'workouts', 'sets', 'recommendations', 'profiles'],
      'readwrite',
    );
    for (const e of exercises) void tx.objectStore('exercises').put(e);
    for (const [exercise_id, list] of aliases) void tx.objectStore('aliases').put({ exercise_id, aliases: list });
    for (const w of workouts) void tx.objectStore('workouts').put(w);
    for (const s of sets) void tx.objectStore('sets').put(s);
    for (const r of recs) void tx.objectStore('recommendations').put(r);
    if (profile) void tx.objectStore('profiles').put(profile);
    await tx.done;
  }
}
