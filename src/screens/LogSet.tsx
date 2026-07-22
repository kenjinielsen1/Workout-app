import { useEffect, useMemo, useRef, useState } from 'react';
import { effectiveLoad } from '../lib/effectiveLoad';
import { setE1RM } from '../lib/exerciseStats';
import { equipmentIncrement } from '../lib/rounding';
import { plateLoadout } from '../lib/plateMath';
import { formatRest, nextSetTarget } from '../lib/liveProgression';
import type { HistorySession } from '../lib/exerciseStats';
import { warmupPlan } from '../lib/warmup';
import type { PainType } from '../lib/safety';
import {
  BARBELL_KG_STEP,
  displayStep,
  formatWeightUnit,
  fromInput,
  toDisplay,
  type PlateSystem,
  type WeightUnit,
} from '../lib/units';
import type { Equipment, LoadType } from '../lib/types';
import { NumberStepper } from '../components/NumberStepper';
import { RirSlider } from '../components/RirSlider';
import { PlateChips } from '../components/PlateChips';
import { SessionHistory } from '../components/SessionHistory';
import { PrCelebration } from '../components/PrCelebration';
import { FirstTimeHint } from '../components/FirstTimeHint';
import { haptic } from '../lib/haptics';
import { useRestTimer } from '../hooks/useRestTimer';

export interface LogSetExercise {
  name: string;
  equipment: Equipment;
  load_type: LoadType;
  default_increment_lb: number;
  is_compound: boolean;
  weight_increment_lb?: number | null;
  weight_stack_min_lb?: number | null;
}

export interface LogSetProfile {
  bodyweight_lb: number;
  has_micro_plates: boolean;
  dumbbell_increment_lb: number;
  warmup_enabled?: boolean;
  weight_unit?: WeightUnit;
  plate_system?: PlateSystem;
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
  /** Pain flagged on this set (SCOPE_SAFETY.md); freezes progression. */
  pain?: PainType | null;
}

interface LogSetProps {
  userId: string;
  exercise: LogSetExercise;
  profile: LogSetProfile;
  target: SessionTarget;
  /** Historical best e1RM for this lift, for live PR detection (FEATURES.md #4). */
  priorBestE1RM?: number;
  /** Recent sessions for the one-tap "Last time" glance (FEATURES.md #6). */
  history?: HistorySession[];
  /** When alternating a pair (PAIRING.md), the exercise this rest leads INTO.
   *  UI-only: relabels the rest ("next up · B") and the notification body. Absent
   *  in the normal single-exercise case, where nothing changes. */
  nextUpName?: string;
  onLogSet?: (set: LoggedSet) => void;
  onDeleteSet?: (id: string) => void;
}

const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `set-${Math.random().toString(36).slice(2)}`;

function effectiveNote(weight: number, ex: LogSetExercise, profile: LogSetProfile, unit: WeightUnit): string {
  const eff = effectiveLoad({ weight_lb: weight }, ex, { bodyweight_lb: profile.bodyweight_lb });
  const w = (lb: number) => formatWeightUnit(lb, unit);
  switch (ex.load_type) {
    case 'per_hand':
      return `${w(weight)} each hand · ${w(eff)} on the body`;
    case 'per_side':
      return `${w(weight)} per side · ${w(eff)} total`;
    case 'bodyweight_plus':
      return `bodyweight ${w(profile.bodyweight_lb)} + ${w(weight)} · ${w(eff)} on the body`;
    case 'total':
    default:
      return `${w(eff)} on the body`;
  }
}

export function LogSet({ userId, exercise, profile, target, priorBestE1RM = 0, history = [], nextUpName, onLogSet, onDeleteSet }: LogSetProps) {
  const unit = profile.weight_unit ?? 'lb';
  const isMetricBar = (profile.plate_system ?? 'imperial') === 'metric' && exercise.equipment === 'barbell';
  const weightStep = equipmentIncrement(exercise, profile);
  // Stepper increment in the display unit: 0.5 kg on a metric bar, else the
  // equipment increment converted.
  const displayWeightStep = isMetricBar ? BARBELL_KG_STEP : displayStep(weightStep, unit);
  const [weight, setWeight] = useState(target.target_weight_lb);
  const [reps, setReps] = useState(target.target_reps);
  const [rir, setRir] = useState(2);
  const [isWarmup, setIsWarmup] = useState(false);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [nextNote, setNextNote] = useState<string | null>(null);
  const [prCelebration, setPrCelebration] = useState<{ e1rm: number; prev: number } | null>(null);
  const [pendingBig, setPendingBig] = useState<{ set: Omit<LoggedSet, 'set_number' | 'id'> } | null>(null);
  // Visible set-logged confirmation — the "it registered" signal on platforms that
  // can't buzz (iOS PWA). `n` retriggers the animation on repeat identical logs.
  const [confirm, setConfirm] = useState<{ text: string; n: number } | null>(null);
  const confirmSeq = useRef(0);
  const [showHistory, setShowHistory] = useState(false);
  const [warmupsDone, setWarmupsDone] = useState<Set<number>>(new Set());
  const [pain, setPain] = useState<PainType | null>(null);

  // Opt-in warm-up ramp up to the working weight (FEATURES.md #1). Logged as
  // is_warmup so they never touch e1RM / progression.
  const warmups = useMemo(
    () => warmupPlan(target.target_weight_lb, exercise, profile, profile.warmup_enabled ?? false),
    [target.target_weight_lb, exercise, profile],
  );

  // Live PR detection: baseline = historical best, then the running best of this
  // session's working sets. Snapshot stays synced until the first set is logged.
  const bestE1RMRef = useRef(priorBestE1RM);
  useEffect(() => {
    if (sets.length === 0) bestE1RMRef.current = priorBestE1RM;
  }, [priorBestE1RM, sets.length]);

  // Imperial plate chips only; a metric bar shows the converted effective-load
  // note instead (imperial plate denominations don't apply at a metric gym).
  const plates = useMemo(
    () => (isMetricBar ? null : plateLoadout(weight, exercise, profile)),
    [weight, exercise, profile, isMetricBar],
  );
  const workingCount = sets.filter((s) => !s.is_warmup).length;

  // Wall-clock rest timer: survives lock/close and notifies at zero (BUGFIXES.md).
  const timer = useRestTimer(userId);
  const showTimer = timer.resting || timer.done;

  // The set-logged confirmation clears itself after a beat.
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(null), 1100);
    return () => clearTimeout(t);
  }, [confirm]);

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

  const commit = (s: Omit<LoggedSet, 'set_number' | 'id'>, opts?: { affirm?: boolean }) => {
    // e1RM PR: a countable set that beats the running best. Fire once per new best.
    let is_pr = false;
    const e = setE1RM({ weight_lb: s.weight_lb, reps: s.reps, is_warmup: s.is_warmup, failed: s.failed }, exercise, profile);
    if (e !== null && e > bestE1RMRef.current + 1e-9) {
      is_pr = true;
      const prev = bestE1RMRef.current; // capture BEFORE overwriting → delta vs. last
      bestE1RMRef.current = e;
      setPrCelebration({ e1rm: e, prev }); // lb e1RM; formatted to the display unit at render
    } else if (!s.is_warmup) {
      setPrCelebration(null); // a normal working set clears a stale celebration
    }

    // Tactile confirm the instant it registers (POLISH.md §2): a PR is the
    // strongest buzz, a miss is soft (acknowledged, not punished), hitting target
    // is affirmative, a plain log ticks. The logged row appearing is the visual
    // fallback where the Vibration API is unsupported (iOS).
    haptic(is_pr ? 'strong' : s.failed ? 'soft' : opts?.affirm ? 'affirm' : 'tick');

    // Visible confirmation for every log (the PR gets the copper moment instead).
    if (!is_pr) {
      const text = s.is_warmup ? 'Warm-up logged' : s.failed ? 'Miss logged' : opts?.affirm ? 'Hit target' : 'Set logged';
      setConfirm({ text, n: ++confirmSeq.current });
    }

    const logged: LoggedSet = { ...s, id: newId(), set_number: sets.length + 1, is_pr, pain };
    setSets((prev) => [...prev, logged]);
    onLogSet?.(logged);
    if (pain) setPain(null); // clear after flagging so it doesn't silently carry

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
      // Paired: the rest leads into the OTHER exercise, so label it (and the
      // notification) with what's up next. Duration is unchanged either way.
      timer.start(next.rest_seconds, nextUpName ?? exercise.name);
    }
  };

  // Fat-finger guard (POLISH.md §4): a typo'd 2250 for 225 would silently corrupt
  // the e1RM. Sanity-bound a working-weight entry against the target (which already
  // encodes recent history); >2× or <0.5× off asks a gentle confirm before logging.
  // Warm-ups are intentionally light, so they're exempt.
  const isAbsurd = (w: number, warmup: boolean) =>
    !warmup && target.target_weight_lb > 0 && (w > target.target_weight_lb * 2 || w < target.target_weight_lb * 0.5);

  const logCurrent = () => {
    if (isAbsurd(weight, isWarmup)) {
      setPendingBig({ set: { weight_lb: weight, reps, rir, is_warmup: isWarmup, failed: false } });
      return;
    }
    commit({ weight_lb: weight, reps, rir, is_warmup: isWarmup, failed: false });
  };

  const hitTarget = () => {
    setWeight(target.target_weight_lb);
    setReps(target.target_reps);
    commit(
      {
        weight_lb: target.target_weight_lb,
        reps: target.target_reps,
        rir,
        is_warmup: false,
        failed: false,
      },
      { affirm: true },
    );
  };

  const markFailed = () => {
    if (isAbsurd(weight, isWarmup)) {
      setPendingBig({ set: { weight_lb: weight, reps, rir: 0, is_warmup: isWarmup, failed: true } });
      return;
    }
    commit({ weight_lb: weight, reps, rir: 0, is_warmup: isWarmup, failed: true });
  };

  const logWarmup = (i: number, w: { weight_lb: number; reps: number }) => {
    commit({ weight_lb: w.weight_lb, reps: w.reps, rir: 4, is_warmup: true, failed: false });
    setWarmupsDone((prev) => new Set(prev).add(i));
  };

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-5 px-4 py-6 text-neutral-900 dark:text-neutral-50">
      {/* Instrumentation around the number: the lift, the target, set progress —
          all demoted to 10–14px so the working weight below is the screen. */}
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-neutral-100">{exercise.name}</h1>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs uppercase tracking-wide text-neutral-500">
          <span>target</span>
          <span className="text-neutral-300">{`${formatWeightUnit(target.target_weight_lb, unit)} × ${target.target_reps}`}</span>
          <span className="ml-1.5">set</span>
          <span className="text-neutral-300">{`${Math.min(workingCount + 1, target.target_sets)} of ${target.target_sets}`}</span>
        </div>
        {target.rationale && (
          <p className="mt-1 text-[13px] leading-snug text-neutral-400">
            {target.rationale}
          </p>
        )}
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
            className="mt-1 self-start text-[13px] font-medium text-neutral-300"
          >
            {showHistory ? 'Hide history ▴' : 'Last time ▾'}
          </button>
        )}
      </header>

      {showHistory && history.length > 0 && (
        <SessionHistory title={`Last ${history.length} — ${exercise.name}`} sessions={history} unit={unit} />
      )}

      {warmups.length > 0 && (
        <section aria-label="Warm-up sets" className="flex flex-col gap-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Warm-up
          </h2>
          <ul className="flex flex-col gap-1.5">
            {warmups.map((w, i) => {
              const done = warmupsDone.has(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => logWarmup(i, w)}
                    disabled={done}
                    aria-label={`Log warm-up ${w.weight_lb} by ${w.reps}`}
                    className={`flex w-full items-center justify-between rounded-xl border border-dashed px-3 py-2 text-sm ${
                      done
                        ? 'border-transparent bg-neutral-100 text-neutral-400 line-through dark:bg-neutral-800'
                        : 'border-amber-300 text-neutral-700 active:scale-[0.99] dark:border-amber-700/50 dark:text-neutral-200'
                    }`}
                  >
                    <span className="font-medium tabular-nums">
                      {formatWeightUnit(w.weight_lb, unit)} × {w.reps}
                    </span>
                    <span className="text-xs">{done ? 'logged' : 'tap to log'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {prCelebration !== null && (
        <PrCelebration e1rm={prCelebration.e1rm} prev={prCelebration.prev} unit={unit} />
      )}

      {nextNote && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Next set</span>
            <span className="text-sm font-semibold">{nextNote}</span>
          </div>
          {showTimer && (
            <div className="flex flex-col items-end gap-1">
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
              {nextUpName && (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  next up · {nextUpName}
                </span>
              )}
            </div>
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
        size="hero"
        value={Number(toDisplay(weight, unit).toFixed(2))}
        onChange={(dv) => setWeight(fromInput(dv, unit))}
        step={displayWeightStep}
        unit={unit}
        data-testid="weight-input"
      />

      <PlateChips result={plates} effectiveNote={effectiveNote(weight, exercise, profile, unit)} />

      <NumberStepper
        label="Reps"
        value={reps}
        onChange={(n) => setReps(Math.round(n))}
        step={1}
        data-testid="reps-input"
      />

      <FirstTimeHint id="rir-slider">
        RIR is reps in reserve — how many you could still do at the end of a set. It’s
        how the app reads your effort and decides when to add weight.
      </FirstTimeHint>
      <RirSlider value={rir} onChange={setRir} />

      <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
        <input
          type="checkbox"
          checked={isWarmup}
          onChange={(e) => setIsWarmup(e.target.checked)}
          className="h-5 w-5 rounded accent-neutral-100"
        />
        Warm-up set (excluded from progression)
      </label>

      {/* SCOPE_SAFETY.md: flag pain (not just soreness). Freezes progression. */}
      <div className="flex flex-col gap-1" role="group" aria-label="Flag pain">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Pain on this set? (not normal soreness)</span>
        <div className="flex gap-1.5">
          {([
            [null, 'None'],
            ['muscular', 'Achy / muscular'],
            ['joint_sharp', 'Sharp / joint'],
          ] as const).map(([value, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={pain === value}
              onClick={() => setPain(value)}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold ${
                pain === value
                  ? value === null
                    ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100'
                    : 'bg-amber-500 text-white'
                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {pain && (
          <span className="text-[11px] leading-snug text-amber-700 dark:text-amber-400">
            Flagging pain pauses progression on this lift — that’s a safety feature, not a setback.
          </span>
        )}
      </div>

      {pendingBig && (
        <div role="alertdialog" aria-label="Confirm weight" className="flex flex-col gap-3 rounded-2xl border border-amber-500/60 bg-neutral-800 px-4 py-3">
          <p className="text-sm leading-snug text-neutral-200">
            <span className="font-semibold tabular-nums">{formatWeightUnit(pendingBig.set.weight_lb, unit)}</span> is a big jump from your target of{' '}
            <span className="font-semibold tabular-nums">{formatWeightUnit(target.target_weight_lb, unit)}</span>. Log it?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { const p = pendingBig; setPendingBig(null); commit(p.set); }}
              className="flex-1 rounded-2xl bg-neutral-100 py-3 font-bold text-neutral-900 active:scale-[0.99]"
            >
              Log it
            </button>
            <button
              type="button"
              onClick={() => setPendingBig(null)}
              className="flex-1 rounded-2xl border border-neutral-600 py-3 font-semibold text-neutral-200 active:scale-[0.99]"
            >
              Go back
            </button>
          </div>
        </div>
      )}

      {confirm && (
        <div
          key={confirm.n}
          role="status"
          className="confirm-pop flex items-center justify-center gap-2 rounded-2xl bg-neutral-100 py-3 text-sm font-bold text-neutral-900"
        >
          <span aria-hidden>✓</span> {confirm.text}
        </div>
      )}

      {/* One clear action: chalk-on-iron, and wider than the rest. The secondary
          pair stays quiet iron so the primary is unmistakable at arm's length. */}
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={hitTarget}
          className="flex-[2] rounded-2xl bg-neutral-100 py-4 text-lg font-bold text-neutral-900 active:scale-[0.99]"
        >
          Hit target
        </button>
        <button
          type="button"
          onClick={logCurrent}
          className="flex-1 rounded-2xl border border-neutral-600 py-4 font-semibold text-neutral-200 active:scale-[0.99]"
        >
          Log set
        </button>
        <button
          type="button"
          onClick={markFailed}
          className="rounded-2xl border border-neutral-700 px-4 py-4 font-medium text-neutral-400 active:scale-[0.99]"
        >
          Missed
        </button>
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
                className="row-in flex items-center justify-between gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  {s.is_warmup ? 'Warm-up' : `Set ${s.set_number}`}
                  {s.is_pr && (
                    <span className="rounded-full border border-neutral-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-300">
                      PR
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">
                    {formatWeightUnit(s.weight_lb, unit)} × {s.reps}
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
