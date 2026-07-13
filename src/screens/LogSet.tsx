import { useEffect, useMemo, useRef, useState } from 'react';
import { effectiveLoad } from '../lib/effectiveLoad';
import { setE1RM } from '../lib/exerciseStats';
import { equipmentIncrement } from '../lib/rounding';
import { plateLoadout } from '../lib/plateMath';
import { formatRest, nextSetTarget } from '../lib/liveProgression';
import type { Equipment, LoadType } from '../lib/types';
import { NumberStepper } from '../components/NumberStepper';
import { RirSlider } from '../components/RirSlider';
import { PlateChips } from '../components/PlateChips';
import { useRestTimer } from '../hooks/useRestTimer';

export interface LogSetExercise {
  name: string;
  equipment: Equipment;
  load_type: LoadType;
  default_increment_lb: number;
  is_compound: boolean;
}

export interface LogSetProfile {
  bodyweight_lb: number;
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
}

export interface SessionTarget {
  target_weight_lb: number;
  target_reps: number;
  target_sets: number;
  rationale?: string;
}

export interface LoggedSet {
  id: string;
  set_number: number;
  weight_lb: number;
  reps: number;
  rir: number;
  is_warmup: boolean;
  failed: boolean;
  /** Set a new e1RM personal record this session (FEATURES.md #4). Display-only. */
  is_pr?: boolean;
}

interface LogSetProps {
  userId: string;
  exercise: LogSetExercise;
  profile: LogSetProfile;
  target: SessionTarget;
  /** Historical best e1RM for this lift, for live PR detection (FEATURES.md #4). */
  priorBestE1RM?: number;
  onLogSet?: (set: LoggedSet) => void;
  onDeleteSet?: (id: string) => void;
}

const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `set-${Math.random().toString(36).slice(2)}`;

function effectiveNote(weight: number, ex: LogSetExercise, profile: LogSetProfile): string {
  const eff = effectiveLoad({ weight_lb: weight }, ex, { bodyweight_lb: profile.bodyweight_lb });
  switch (ex.load_type) {
    case 'per_hand':
      return `${weight} lb each hand · ${eff} lb on the body`;
    case 'per_side':
      return `${weight} lb per side · ${eff} lb total`;
    case 'bodyweight_plus':
      return `bodyweight ${profile.bodyweight_lb} + ${weight} · ${eff} lb on the body`;
    case 'total':
    default:
      return `${eff} lb on the body`;
  }
}

export function LogSet({ userId, exercise, profile, target, priorBestE1RM = 0, onLogSet, onDeleteSet }: LogSetProps) {
  const weightStep = equipmentIncrement(exercise, profile);
  const [weight, setWeight] = useState(target.target_weight_lb);
  const [reps, setReps] = useState(target.target_reps);
  const [rir, setRir] = useState(2);
  const [isWarmup, setIsWarmup] = useState(false);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [nextNote, setNextNote] = useState<string | null>(null);
  const [prCelebration, setPrCelebration] = useState<number | null>(null);

  // Live PR detection: baseline = historical best, then the running best of this
  // session's working sets. Snapshot stays synced until the first set is logged.
  const bestE1RMRef = useRef(priorBestE1RM);
  useEffect(() => {
    if (sets.length === 0) bestE1RMRef.current = priorBestE1RM;
  }, [priorBestE1RM, sets.length]);

  const plates = useMemo(
    () => plateLoadout(weight, exercise, profile),
    [weight, exercise, profile],
  );
  const workingCount = sets.filter((s) => !s.is_warmup).length;

  // Wall-clock rest timer: survives lock/close and notifies at zero (BUGFIXES.md).
  const timer = useRestTimer(userId);
  const showTimer = timer.resting || timer.done;

  // Keep the inputs on the target until the first set is logged. Switching
  // exercises recomputes the target asynchronously, so the fresh number arrives
  // *after* this screen has mounted with the previous lift's values — without
  // this sync you'd have to re-enter weight/reps by hand every time you switch.
  // Once a set is logged, set-to-set autoregulation owns the inputs, so we stop.
  useEffect(() => {
    if (sets.length === 0) {
      setWeight(target.target_weight_lb);
      setReps(target.target_reps);
    }
  }, [target.target_weight_lb, target.target_reps, sets.length]);

  const removeSet = (id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
    onDeleteSet?.(id);
  };

  const commit = (s: Omit<LoggedSet, 'set_number' | 'id'>) => {
    // e1RM PR: a countable set that beats the running best. Fire once per new best.
    let is_pr = false;
    const e = setE1RM({ weight_lb: s.weight_lb, reps: s.reps, is_warmup: s.is_warmup, failed: s.failed }, exercise, profile);
    if (e !== null && e > bestE1RMRef.current + 1e-9) {
      is_pr = true;
      bestE1RMRef.current = e;
      setPrCelebration(Math.round(e));
    } else if (!s.is_warmup) {
      setPrCelebration(null); // a normal working set clears a stale celebration
    }

    const logged: LoggedSet = { ...s, id: newId(), set_number: sets.length + 1, is_pr };
    setSets((prev) => [...prev, logged]);
    onLogSet?.(logged);

    // LIVE within-session autoregulation: advance the next set instantly, locally.
    if (!s.is_warmup) {
      const next = nextSetTarget({
        currentWeight: s.weight_lb,
        targetReps: target.target_reps,
        last: { reps: s.reps, rir: s.rir, failed: s.failed },
        exercise,
        profile,
      });
      setWeight(next.weight_lb);
      setReps(next.target_reps);
      setNextNote(next.note);
      timer.start(next.rest_seconds, exercise.name);
    }
  };

  const logCurrent = () => {
    commit({ weight_lb: weight, reps, rir, is_warmup: isWarmup, failed: false });
  };

  const hitTarget = () => {
    setWeight(target.target_weight_lb);
    setReps(target.target_reps);
    commit({
      weight_lb: target.target_weight_lb,
      reps: target.target_reps,
      rir,
      is_warmup: false,
      failed: false,
    });
  };

  const markFailed = () => {
    commit({ weight_lb: weight, reps, rir: 0, is_warmup: isWarmup, failed: true });
  };

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-5 px-4 py-6 text-neutral-900 dark:text-neutral-50">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{exercise.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white">
            Target {target.target_weight_lb} lb × {target.target_reps}
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">
            set {Math.min(workingCount + 1, target.target_sets)} of {target.target_sets}
          </span>
        </div>
        {target.rationale && (
          <p className="mt-1 text-sm leading-snug text-neutral-500 dark:text-neutral-400">
            {target.rationale}
          </p>
        )}
      </header>

      {prCelebration !== null && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-white"
        >
          <span className="text-lg" aria-hidden>🎉</span>
          <span className="text-sm font-bold">New PR — {prCelebration} lb estimated 1RM!</span>
        </div>
      )}

      {nextNote && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Next set</span>
            <span className="text-sm font-semibold">{nextNote}</span>
          </div>
          {showTimer && (
            <button
              type="button"
              onClick={timer.dismiss}
              aria-label="rest timer"
              className={`rounded-xl px-3 py-2 text-lg font-bold tabular-nums ${
                timer.resting ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700'
              }`}
            >
              {timer.resting ? formatRest(timer.remaining) : 'rest done'}
            </button>
          )}
        </div>
      )}

      {timer.resting && timer.capability.needsInstall && (
        <p className="-mt-2 text-xs leading-snug text-amber-700 dark:text-amber-400">
          Add this app to your Home Screen to get a rest-complete alert while your
          phone is locked — Safari tabs can’t send notifications on iOS.
        </p>
      )}
      {timer.resting &&
        !timer.capability.needsInstall &&
        timer.capability.supported &&
        timer.capability.permission === 'denied' && (
          <p className="-mt-2 text-xs leading-snug text-neutral-500 dark:text-neutral-400">
            Notifications are off, so the timer only alerts while the app is open.
            Enable notifications to be pinged when rest ends.
          </p>
        )}

      <NumberStepper
        label="Weight"
        value={weight}
        onChange={setWeight}
        step={weightStep}
        unit="lb"
        data-testid="weight-input"
      />

      <PlateChips result={plates} effectiveNote={effectiveNote(weight, exercise, profile)} />

      <NumberStepper
        label="Reps"
        value={reps}
        onChange={(n) => setReps(Math.round(n))}
        step={1}
        data-testid="reps-input"
      />

      <RirSlider value={rir} onChange={setRir} />

      <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
        <input
          type="checkbox"
          checked={isWarmup}
          onChange={(e) => setIsWarmup(e.target.checked)}
          className="h-5 w-5 rounded accent-emerald-600"
        />
        Warm-up set (excluded from progression)
      </label>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={hitTarget}
          className="rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white active:scale-[0.99]"
        >
          Hit target ✓
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={logCurrent}
            className="flex-1 rounded-2xl bg-neutral-200 py-3 font-semibold text-neutral-800 active:scale-[0.99] dark:bg-neutral-700 dark:text-neutral-100"
          >
            Log set
          </button>
          <button
            type="button"
            onClick={markFailed}
            className="rounded-2xl bg-neutral-100 px-4 py-3 font-medium text-amber-700 active:scale-[0.99] dark:bg-neutral-800 dark:text-amber-400"
          >
            Missed
          </button>
        </div>
      </div>

      {sets.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            Logged
          </h2>
          <ul className="flex flex-col gap-1.5">
            {sets.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  {s.is_warmup ? 'Warm-up' : `Set ${s.set_number}`}
                  {s.is_pr && (
                    <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      PR
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">
                    {s.weight_lb} lb × {s.reps}
                    {s.failed ? (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">missed</span>
                    ) : (
                      <span className="ml-2 text-neutral-400">@{s.rir} RIR</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSet(s.id)}
                    aria-label={`clear set ${s.set_number}`}
                    className="grid h-6 w-6 place-items-center rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-red-500 dark:hover:bg-neutral-700"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
