import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useStore } from '../data/StoreProvider';
import type { AllSession, CreateExerciseInput, Exercise, ExerciseOverride, Profile } from '../data/domain';
import { deriveInitialTarget, type SessionTarget } from '../lib/target';
import { exerciseFeatures, recommendTarget, sessionsForExercise } from '../lib/recommend';
import { isMLConfigured, predict } from '../lib/mlClient';
import type { FinalTarget, MLPrediction } from '../lib/blend';
import { bestSetE1RM, recentSessions, summarize } from '../lib/exerciseStats';
import { dailyReadiness, repRangeForGoal, shiftedRepRange, type DailyCheckin } from '../lib/progression';
import { equipmentIncrement, snapToLoadable } from '../lib/rounding';
import { variantsOf } from '../lib/variants';
import { weeklyHardSets, weekStartOf, volumeState } from '../lib/volume';
import { landmarksFor } from '../lib/volumeLandmarks';
import { formatDuration } from '../lib/liveProgression';
import { LogSet, type LoggedSet } from './LogSet';
import { ExerciseDetail } from './ExerciseDetail';
import { ExercisePicker, type PickerExercise } from '../components/ExercisePicker';
import { WorkoutLog, type WorkoutLogEntry } from '../components/WorkoutLog';
import { ReadinessCheckIn, type CheckinAnswers } from '../components/ReadinessCheckIn';
import { PlateauCard } from '../components/PlateauCard';
import { IncrementPrompt } from '../components/IncrementPrompt';
import type { VolumeRow } from '../components/VolumeView';
import type { PlateauChoice } from '../data/domain';
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

  // Per-user machine increment overrides (INCREMENTS.md), merged onto exercises so
  // every downstream rounding call (recommendation, warm-up, live) is loadable at
  // THIS gym.
  const [overrides, setOverrides] = useState<Map<string, ExerciseOverride>>(new Map());
  const resolvedExercises = useMemo(
    () =>
      exercises.map((e) => {
        const o = overrides.get(e.id);
        return o
          ? {
              ...e,
              weight_increment_lb: o.weight_increment_lb ?? e.weight_increment_lb ?? null,
              weight_stack_min_lb: o.weight_stack_min_lb ?? e.weight_stack_min_lb ?? null,
            }
          : e;
      }),
    [exercises, overrides],
  );

  const index = useMemo(() => new Map(resolvedExercises.map((e) => [e.id, e] as const)), [resolvedExercises]);

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

  // Load catalog (+ aliases for search) + profile + overrides once.
  useEffect(() => {
    let active = true;
    Promise.all([
      store.listExercises(userId),
      store.getProfile(userId),
      store.listSearchable(userId),
      store.getOverrides(userId),
    ]).then(([ex, p, searchable, ovr]) => {
      if (!active) return;
      setExercises(ex);
      setProfile(p);
      setAliasById(new Map(searchable.map((s) => [s.id, s.aliases])));
      setOverrides(new Map(ovr.map((o) => [o.exercise_id, o])));
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
      const ex = resolvedExercises.find((e) => e.id === exId);
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
    [store, userId, resolvedExercises, index, readinessValue],
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

      // One-time INCREMENTS.md calibration: first working set on a cable/machine
      // with no override yet → ask the machine's real step so future targets are
      // selectable at this gym.
      const ex = index.get(selectedId);
      const isMachine = ex?.equipment === 'cable' || ex?.equipment === 'machine_selectorized';
      const promptedKey = `po:incPrompted:${userId}:${selectedId}`;
      if (
        !logged.is_warmup &&
        isMachine &&
        !overrides.has(selectedId) &&
        !localStorage.getItem(promptedKey)
      ) {
        setIncrementPromptFor(selectedId);
      }
    },
    [store, userId, selectedId, startTimerIfNeeded, checkin, readinessValue, index, overrides],
  );

  const [incrementPromptFor, setIncrementPromptFor] = useState<string | null>(null);

  const saveIncrement = useCallback(
    async (increment: number, min: number | null) => {
      const exId = incrementPromptFor;
      if (!exId) return;
      localStorage.setItem(`po:incPrompted:${userId}:${exId}`, '1');
      setIncrementPromptFor(null);
      await store.setOverride(userId, exId, { weight_increment_lb: increment, weight_stack_min_lb: min });
      setOverrides((m) => new Map(m).set(exId, { user_id: userId, exercise_id: exId, weight_increment_lb: increment, weight_stack_min_lb: min }));
      void store.flush();
    },
    [store, userId, incrementPromptFor],
  );

  const skipIncrement = useCallback(() => {
    if (incrementPromptFor) localStorage.setItem(`po:incPrompted:${userId}:${incrementPromptFor}`, '1');
    setIncrementPromptFor(null);
  }, [userId, incrementPromptFor]);

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
    const ex = resolvedExercises.find((e) => e.id === selectedId);
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
  }, [store, userId, resolvedExercises, index, selectedId, profile, target, computeTarget, stopTimer]);

  const selected = resolvedExercises.find((e) => e.id === selectedId);
  const detailSessions = allSessions.filter((s) => s.exercise_id === selectedId);

  // Historical best e1RM for the selected lift, for live PR flagging (FEATURES.md #4).
  const priorBestE1RM = useMemo(() => {
    if (!selected || !profile) return 0;
    return (
      summarize(detailSessions, { load_type: selected.load_type }, { bodyweight_lb: profile.bodyweight_lb })
        .bestE1RM ?? 0
    );
  }, [detailSessions, selected, profile]);

  // Last 5 sessions for the one-tap "Last time" glance on Log Set (FEATURES.md #6).
  const exerciseHistory = useMemo(() => {
    if (!selected || !profile) return [];
    return recentSessions(detailSessions, { load_type: selected.load_type }, { bodyweight_lb: profile.bodyweight_lb }, 5);
  }, [detailSessions, selected, profile]);

  // This week's hard-set volume for the muscles the selected lift trains
  // (VOLUME.md). Read-only view; computed from all sessions + the catalog.
  const volumeRows = useMemo<VolumeRow[]>(() => {
    if (!selected || !profile) return [];
    const week = weeklyHardSets(allSessions, index, profile, profile.goal, weekStartOf(new Date().toISOString()));
    const muscles = [...selected.primary_muscles, ...selected.secondary_muscles];
    return [...new Set(muscles)].map((muscle) => ({
      muscle,
      hardSets: week.get(muscle) ?? 0,
      landmarks: landmarksFor(muscle),
    }));
  }, [allSessions, index, selected, profile]);

  // Hypertrophy under-volume signal for the plateau breaker: a stall at adequate
  // load may be an under-volume problem — suggest adding a set before deloading.
  const underVolume = useMemo(() => {
    if (!profile || profile.goal !== 'hypertrophy') return false;
    return volumeRows.some((r) => r.hardSets < r.landmarks.mav && volumeState(r.hardSets, r.landmarks) !== 'over_mrv');
  }, [profile, volumeRows]);

  // Plateau breaker (FEATURES.md #5): the engine flags a genuine stall on the
  // target; offer a choice rather than silently deloading. Resolved (or twice
  // ignored) cards stay hidden for the exercise.
  const plateau = (target as FinalTarget | null)?.plateau ?? false;
  const [plateauResolved, setPlateauResolved] = useState<Set<string>>(new Set());
  const variants = useMemo(
    () => (selected ? variantsOf(selected, exercises).map((e) => ({ id: e.id, name: e.name, variant_of: e.variant_of })) : []),
    [selected, exercises],
  );

  const resolvePlateau = useCallback(
    async (choice: PlateauChoice, variantId?: string) => {
      if (recommendationId.current) await store.recordPlateauChoice(recommendationId.current, choice);
      setPlateauResolved((s) => new Set(s).add(selectedId));
      if (choice === 'variation' && variantId) {
        setSelectedId(variantId); // switch lifts; its own history seeds the load
      } else if (choice === 'rep_range_shift' && selected && profile) {
        const shifted = shiftedRepRange(profile.goal, selected.is_compound);
        setTarget((t) => (t ? { ...t, target_reps: shifted.min } : t));
      } else if (choice === 'deload' && selected && profile) {
        const range = repRangeForGoal(profile.goal, selected.is_compound);
        setTarget((t) =>
          t
            ? { ...t, target_weight_lb: snapToLoadable(t.target_weight_lb * 0.9, selected, profile, 'floor'), target_reps: range.min }
            : t,
        );
      }
      void store.flush();
    },
    [store, selectedId, selected, profile],
  );

  const dismissPlateau = useCallback(() => {
    const key = `po:plateauSkips:${userId}:${selectedId}`;
    const n = Number(localStorage.getItem(key) ?? 0) + 1;
    localStorage.setItem(key, String(n));
    if (n >= 2) void resolvePlateau('deload'); // ignored twice → default to deload
    else setPlateauResolved((s) => new Set(s).add(selectedId));
  }, [userId, selectedId, resolvePlateau]);

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
          {plateau && !plateauResolved.has(selectedId) && selected && profile && (
            <div className="px-4">
              <PlateauCard
                currentRange={repRangeForGoal(profile.goal, selected.is_compound)}
                shiftedRange={shiftedRepRange(profile.goal, selected.is_compound)}
                variants={variants}
                underVolume={underVolume}
                onChoose={resolvePlateau}
                onDismiss={dismissPlateau}
              />
            </div>
          )}
          <LogSet
            key={selectedId}
            userId={userId}
            exercise={selected}
            profile={profile}
            target={target}
            priorBestE1RM={priorBestE1RM}
            history={exerciseHistory}
            onLogSet={onLogSet}
            onDeleteSet={onDeleteSet}
          />
          <WorkoutLog entries={workoutLog} currentExerciseId={selectedId} unit={profile?.weight_unit} />
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
        <ExerciseDetail exercise={selected} profile={profile} sessions={detailSessions} volumeRows={volumeRows} />
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

      {incrementPromptFor && index.get(incrementPromptFor) && (
        <IncrementPrompt
          exerciseName={index.get(incrementPromptFor)!.name}
          defaultIncrement={equipmentIncrement(index.get(incrementPromptFor)!, profile ?? { has_micro_plates: false, dumbbell_increment_lb: 5 })}
          onSave={saveIncrement}
          onSkip={skipIncrement}
        />
      )}
    </div>
  );
}
