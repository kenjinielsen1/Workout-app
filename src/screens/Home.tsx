import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useStore } from '../data/StoreProvider';
import type { AllSession, CreateExerciseInput, Exercise, Profile } from '../data/domain';
import { deriveInitialTarget, type SessionTarget } from '../lib/target';
import { exerciseFeatures, recommendTarget, sessionsForExercise } from '../lib/recommend';
import { isMLConfigured, predict } from '../lib/mlClient';
import type { FinalTarget, MLPrediction } from '../lib/blend';
import { bestSetE1RM } from '../lib/exerciseStats';
import { dailyReadiness, type DailyCheckin } from '../lib/progression';
import { formatDuration } from '../lib/liveProgression';
import { LogSet, type LoggedSet } from './LogSet';
import { ExerciseDetail } from './ExerciseDetail';
import { ExercisePicker, type PickerExercise } from '../components/ExercisePicker';
import { WorkoutLog, type WorkoutLogEntry } from '../components/WorkoutLog';
import { ReadinessCheckIn, type CheckinAnswers } from '../components/ReadinessCheckIn';
import { Settings } from './Settings';

type Tab = 'detail' | 'log';

export function Home() {
  const { user, signOut } = useAuth();
  const store = useStore();
  const userId = user!.id;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [aliasById, setAliasById] = useState<Map<string, string[]>>(new Map());
  const [selectedId, setSelectedId] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allSessions, setAllSessions] = useState<AllSession[]>([]);
  const [target, setTarget] = useState<SessionTarget | null>(null);
  const [tab, setTab] = useState<Tab>('log');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Session-start readiness check-in (FEATURES.md #2). Persisted per calendar day
  // so it survives reloads and re-asks tomorrow. `dismissed` covers skip too.
  const today = new Date().toISOString().slice(0, 10);
  const checkinKey = `po:checkin:${userId}:${today}`;
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
  const [checkinDismissed, setCheckinDismissed] = useState(false);

  // Workout timer: starts at the first logged set of the session, spans exercises,
  // survives a reload (localStorage), stops on finish.
  const timerKey = `po:workoutStart:${userId}`;
  const [workoutStartedAt, setWorkoutStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const workoutId = useRef<string | null>(null);
  const setCounter = useRef(0);
  const recommendationId = useRef<string | null>(null);

  const index = useMemo(() => new Map(exercises.map((e) => [e.id, e] as const)), [exercises]);

  // Resume a workout timer that was running before a reload.
  useEffect(() => {
    const raw = localStorage.getItem(timerKey);
    const t = raw ? Number(raw) : NaN;
    if (Number.isFinite(t) && t > 0) setWorkoutStartedAt(t);
  }, [timerKey]);

  // Restore today's check-in (answered or skipped) after a reload.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(checkinKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { checkin: DailyCheckin | null; dismissed: boolean };
      setCheckin(saved.checkin ?? null);
      setCheckinDismissed(saved.dismissed ?? false);
    } catch {
      /* corrupt entry — re-ask */
    }
  }, [checkinKey]);

  const readinessValue = dailyReadiness(checkin);

  const submitCheckin = useCallback(
    (answers: CheckinAnswers) => {
      const c: DailyCheckin = { ...answers };
      setCheckin(c);
      setCheckinDismissed(true);
      localStorage.setItem(checkinKey, JSON.stringify({ checkin: c, dismissed: true }));
    },
    [checkinKey],
  );

  const skipCheckin = useCallback(() => {
    setCheckin(null);
    setCheckinDismissed(true);
    localStorage.setItem(checkinKey, JSON.stringify({ checkin: null, dismissed: true }));
  }, [checkinKey]);

  // Tick every second while the timer runs.
  useEffect(() => {
    if (workoutStartedAt === null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [workoutStartedAt]);

  const elapsedSec = workoutStartedAt === null ? 0 : Math.max(0, Math.floor((now - workoutStartedAt) / 1000));

  const startTimerIfNeeded = useCallback(() => {
    setWorkoutStartedAt((prev) => {
      if (prev !== null) return prev;
      const t = Date.now();
      localStorage.setItem(timerKey, String(t));
      return t;
    });
  }, [timerKey]);

  const stopTimer = useCallback(() => {
    setWorkoutStartedAt(null);
    localStorage.removeItem(timerKey);
  }, [timerKey]);

  // Load catalog (+ aliases for search) + profile once.
  useEffect(() => {
    let active = true;
    Promise.all([
      store.listExercises(userId),
      store.getProfile(userId),
      store.listSearchable(userId),
    ]).then(([ex, p, searchable]) => {
      if (!active) return;
      setExercises(ex);
      setProfile(p);
      setAliasById(new Map(searchable.map((s) => [s.id, s.aliases])));
      setSelectedId((cur) => cur || ex[0]?.id || '');
    });
    return () => {
      active = false;
    };
  }, [store, userId]);

  const pickerExercises = useMemo<PickerExercise[]>(
    () =>
      exercises.map((e) => ({
        id: e.id,
        name: e.name,
        primary_muscles: e.primary_muscles,
        aliases: aliasById.get(e.id) ?? [],
      })),
    [exercises, aliasById],
  );

  // Compute the recommendation for `exId`: rule engine → optional ML blend → rails.
  const computeTarget = useCallback(
    async (exId: string, p: Profile) => {
      const ex = exercises.find((e) => e.id === exId);
      if (!ex) return;
      const all = await store.getAllSessions(userId);
      setAllSessions(all);

      workoutId.current = null;
      setCounter.current = 0;

      // OFFLINE-FIRST live path: the shown number is pure local TS, no network.
      // Prefer a target precomputed at the last session's finish — but only when
      // there's no check-in to fold in (the precompute predates today's readiness).
      const precomputed = (await store.getNextSession(userId, exId)) as FinalTarget | null;
      const fresh =
        readinessValue === 0 && precomputed
          ? precomputed
          : recommendTarget(all, ex, index, p, null, p.ml_alpha_cap, readinessValue);
      const shown = fresh ?? deriveInitialTarget(all.filter((s) => s.exercise_id === exId), ex, p.goal);
      setTarget(shown);

      if (fresh) {
        // Local write + enqueue sync; never awaits the network.
        recommendationId.current = await store.saveRecommendation({
          user_id: userId,
          exercise_id: exId,
          target_weight_lb: fresh.target_weight_lb,
          target_reps: fresh.target_reps,
          target_sets: fresh.target_sets,
          confidence: fresh.confidence,
          rationale: fresh.rationale ?? '',
          alpha: fresh.alpha,
          rule_pred_e1rm: fresh.rule_e1rm ?? null,
          ml_pred_e1rm: fresh.ml_e1rm ?? null,
        });
      } else {
        recommendationId.current = null;
      }

      // Deferred path: ML only *refines* the local number, and only if it returns
      // before training starts. Offline / unconfigured → skipped entirely.
      if (isMLConfigured) {
        const feats = exerciseFeatures(all, ex, index, p);
        void predict(feats, all.length, sessionsForExercise(all, exId)).then((ml) => {
          if (!ml || workoutId.current !== null) return;
          const refined = recommendTarget(all, ex, index, p, ml, p.ml_alpha_cap, readinessValue);
          if (refined) setTarget(refined);
        });
      }
    },
    [store, userId, exercises, index, readinessValue],
  );

  // Recompute when the exercise changes (or once everything has loaded).
  useEffect(() => {
    if (selectedId && profile) void computeTarget(selectedId, profile);
  }, [selectedId, profile, computeTarget]);

  const onLogSet = useCallback(
    async (logged: LoggedSet) => {
      startTimerIfNeeded(); // first set of the session starts the workout clock
      if (!workoutId.current) {
        const w = await store.startWorkout(userId, undefined, {
          sleep_quality: checkin?.sleep_quality ?? null,
          soreness: checkin?.soreness ?? null,
          energy: checkin?.energy ?? null,
          readiness_score: checkin ? readinessValue : null,
        });
        workoutId.current = w.id;
      }
      setCounter.current += 1;
      await store.logSet({
        id: logged.id,
        workout_id: workoutId.current,
        exercise_id: selectedId,
        set_number: setCounter.current,
        weight_lb: logged.weight_lb,
        reps: logged.reps,
        rir: logged.rir,
        is_warmup: logged.is_warmup,
        failed: logged.failed,
      });
      setAllSessions(await store.getAllSessions(userId)); // refresh detail; target holds
      void store.flush(); // sync to Supabase within ~a second (no-op offline/demo)
    },
    [store, userId, selectedId, startTimerIfNeeded, checkin, readinessValue],
  );

  const handleSaveSettings = useCallback(
    async (patch: Partial<Profile>) => {
      const updated = await store.upsertProfile(userId, patch);
      setProfile(updated); // triggers a target recompute with the new bodyweight/goal/…
      void store.flush();
    },
    [store, userId],
  );

  const handleCreateExercise = useCallback(
    async (input: CreateExerciseInput) => {
      const ex = await store.createExercise(userId, input);
      setExercises((prev) => [...prev, ex]);
      setAliasById((prev) => new Map(prev).set(ex.id, []));
      setSelectedId(ex.id); // switch to it so you can log against it now
      void store.flush();
    },
    [store, userId],
  );

  const onDeleteSet = useCallback(
    async (id: string) => {
      await store.deleteSet(id);
      setAllSessions(await store.getAllSessions(userId));
      void store.flush();
    },
    [store, userId],
  );

  const finishSession = useCallback(async () => {
    const ex = exercises.find((e) => e.id === selectedId);
    // Close the loop: record what actually happened against the recommendation.
    if (recommendationId.current && workoutId.current && profile && ex && target) {
      const all = await store.getAllSessions(userId);
      const exSessions = all
        .filter((s) => s.exercise_id === selectedId)
        .sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime());
      const latest = exSessions[exSessions.length - 1];
      const working = latest?.sets.filter((s) => !s.is_warmup) ?? [];
      if (latest && working.length) {
        const top = working.reduce((a, b) =>
          b.weight_lb > a.weight_lb || (b.weight_lb === a.weight_lb && b.reps > a.reps) ? b : a,
        );
        const best = bestSetE1RM(latest, { load_type: ex.load_type }, { bodyweight_lb: profile.bodyweight_lb });
        await store.recordOutcome(recommendationId.current, Math.abs(top.weight_lb - target.target_weight_lb) <= 2.5, {
          actual_e1rm: best?.e1rm ?? null,
          actual_top_weight: top.weight_lb,
          actual_reps: top.reps,
          completed: top.reps >= target.target_reps,
        });
      }
      recommendationId.current = null;
    }
    // Precompute & persist the NEXT session's prescription so the next open is
    // instant and network-free (OFFLINE_FIRST: today's session is precomputed).
    if (profile && ex) {
      const all = await store.getAllSessions(userId);
      const next = recommendTarget(all, ex, index, profile, null, profile.ml_alpha_cap);
      if (next) await store.saveNextSession(userId, selectedId, next);
    }
    if (profile) await computeTarget(selectedId, profile);
    void store.flush(); // push the session's sets/recommendation/outcome now
    stopTimer(); // end the workout clock
    setTab('detail');
  }, [store, userId, exercises, index, selectedId, profile, target, computeTarget, stopTimer]);

  const selected = exercises.find((e) => e.id === selectedId);
  const detailSessions = allSessions.filter((s) => s.exercise_id === selectedId);

  // Everything logged since the workout clock started, grouped by movement — a
  // running log across all exercises in this session (survives switching lifts).
  const workoutLog = useMemo<WorkoutLogEntry[]>(() => {
    if (workoutStartedAt === null) return [];
    const since = workoutStartedAt - 60_000; // buffer for clock skew
    const byExercise = new Map<string, WorkoutLogEntry>();
    for (const s of allSessions) {
      if (new Date(s.performed_at).getTime() < since) continue;
      const entry = byExercise.get(s.exercise_id) ?? {
        exercise_id: s.exercise_id,
        name: index.get(s.exercise_id)?.name ?? 'Exercise',
        sets: [],
      };
      entry.sets.push(...s.sets);
      byExercise.set(s.exercise_id, entry);
    }
    return [...byExercise.values()].map((e) => ({
      ...e,
      sets: e.sets.slice().sort((a, b) => a.set_number - b.set_number),
    }));
  }, [allSessions, workoutStartedAt, index]);

  if (!profile || !selected || !target) {
    return <div className="grid min-h-full place-items-center text-neutral-400">Loading…</div>;
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex flex-col gap-2 border-b border-neutral-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Exercise"
            onClick={() => setPickerOpen(true)}
            className="flex max-w-[65%] items-center gap-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-semibold dark:bg-neutral-800"
          >
            <span className="truncate">{selected.name}</span>
            <span aria-hidden className="text-neutral-400">▾</span>
          </button>
          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <button type="button" onClick={() => setSettingsOpen(true)} className="font-semibold hover:underline">
              ⚙ Settings
            </button>
            <button type="button" onClick={signOut} className="hover:underline">
              Sign out
            </button>
          </div>
        </div>
        <nav className="flex items-center justify-between gap-1">
          <div className="flex gap-1">
            {(['log', 'detail'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  tab === t
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                {t === 'log' ? 'Log Set' : 'Exercise Detail'}
              </button>
            ))}
          </div>
          {workoutStartedAt !== null && (
            <span
              aria-label="workout time"
              className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-semibold tabular-nums text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              ⏱ {formatDuration(elapsedSec)}
            </span>
          )}
        </nav>
      </header>

      {tab === 'log' ? (
        <div className="flex flex-col gap-2 pt-3">
          {!checkinDismissed && workoutStartedAt === null && (
            <div className="px-4">
              <ReadinessCheckIn onSubmit={submitCheckin} onSkip={skipCheckin} />
            </div>
          )}
          <LogSet
            key={selectedId}
            userId={userId}
            exercise={selected}
            profile={profile}
            target={target}
            onLogSet={onLogSet}
            onDeleteSet={onDeleteSet}
          />
          <WorkoutLog entries={workoutLog} currentExerciseId={selectedId} />
          <div className="mx-auto w-full max-w-md px-4 py-6">
            <button
              type="button"
              onClick={finishSession}
              className="w-full rounded-2xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-600 active:scale-[0.99] dark:border-neutral-800 dark:text-neutral-300"
            >
              Finish session
            </button>
          </div>
        </div>
      ) : (
        <ExerciseDetail exercise={selected} profile={profile} sessions={detailSessions} />
      )}

      {pickerOpen && (
        <ExercisePicker
          exercises={pickerExercises}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={handleCreateExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {settingsOpen && (
        <Settings profile={profile} onSave={handleSaveSettings} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
