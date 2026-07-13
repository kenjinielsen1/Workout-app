import { useState } from 'react';
import type { Goal } from '../lib/types';
import type { Profile } from '../data/domain';

interface SettingsProps {
  profile: Profile;
  onSave: (patch: Partial<Profile>) => void | Promise<void>;
  onClose: () => void;
}

const GOALS: { value: Goal; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'endurance', label: 'Endurance' },
];

const TRAINING_AGE: { months: number; label: string }[] = [
  { months: 3, label: 'New to lifting (0–6 mo)' },
  { months: 9, label: '6–12 months' },
  { months: 18, label: '1–2 years' },
  { months: 36, label: '2–4 years' },
  { months: 60, label: '4+ years' },
];

function bucketForMonths(m: number): number {
  if (m < 6) return 3;
  if (m < 12) return 9;
  if (m < 24) return 18;
  if (m < 48) return 36;
  return 60;
}

export function Settings({ profile, onSave, onClose }: SettingsProps) {
  const [bodyweight, setBodyweight] = useState(profile.bodyweight_lb);
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [trainingAge, setTrainingAge] = useState(bucketForMonths(profile.training_age_months));
  const [microPlates, setMicroPlates] = useState(profile.has_micro_plates);
  const [dumbbellIncrement, setDumbbellIncrement] = useState(profile.dumbbell_increment_lb);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(profile.sessions_per_week ?? 3);
  const [warmupEnabled, setWarmupEnabled] = useState(profile.warmup_enabled);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave({
      bodyweight_lb: bodyweight,
      goal,
      training_age_months: trainingAge,
      has_micro_plates: microPlates,
      dumbbell_increment_lb: dumbbellIncrement,
      sessions_per_week: sessionsPerWeek,
      warmup_enabled: warmupEnabled,
    });
    onClose();
  };

  const field = 'rounded-xl bg-neutral-100 px-3 py-2 text-base dark:bg-neutral-800';

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/40"
      role="dialog"
      aria-label="Settings"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="mx-auto flex h-full w-full max-w-md flex-col bg-white dark:bg-neutral-900 sm:my-8 sm:h-auto sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-bold">Settings</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-sm font-semibold text-neutral-500">
            Cancel
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 text-neutral-900 dark:text-neutral-50">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-500 dark:text-neutral-400">Bodyweight (lb)</span>
            <input
              type="number"
              inputMode="decimal"
              value={bodyweight}
              min={0}
              step={1}
              aria-label="Bodyweight"
              onChange={(e) => setBodyweight(Number(e.target.value))}
              className={`${field} text-xl font-bold tabular-nums`}
            />
            <span className="text-xs text-neutral-400">Used for dips, pull-ups, and relative-strength stats.</span>
          </label>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-500 dark:text-neutral-400">Goal</span>
            <div className="flex gap-1.5" role="group" aria-label="Goal">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  aria-pressed={goal === g.value}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                    goal === g.value ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-neutral-400">Sets your rep ranges and how close to failure targets sit.</span>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-500 dark:text-neutral-400">Training experience</span>
            <select
              value={trainingAge}
              aria-label="Training experience"
              onChange={(e) => setTrainingAge(Number(e.target.value))}
              className={field}
            >
              {TRAINING_AGE.map((t) => (
                <option key={t.months} value={t.months}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="flex flex-col">
              <span className="font-medium">Micro plates available</span>
              <span className="text-xs text-neutral-400">Lets the bar move in 2.5 lb jumps instead of 5.</span>
            </span>
            <input
              type="checkbox"
              checked={microPlates}
              aria-label="Micro plates available"
              onChange={(e) => setMicroPlates(e.target.checked)}
              className="h-6 w-6 rounded accent-emerald-600"
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="flex flex-col">
              <span className="font-medium">Prescribe warm-up sets</span>
              <span className="text-xs text-neutral-400">Shows a ramp up to your working weight, marked as warm-ups.</span>
            </span>
            <input
              type="checkbox"
              checked={warmupEnabled}
              aria-label="Prescribe warm-up sets"
              onChange={(e) => setWarmupEnabled(e.target.checked)}
              className="h-6 w-6 rounded accent-emerald-600"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-500 dark:text-neutral-400">Dumbbell increment (lb)</span>
            <select
              value={dumbbellIncrement}
              aria-label="Dumbbell increment"
              onChange={(e) => setDumbbellIncrement(Number(e.target.value))}
              className={field}
            >
              {[2.5, 5, 10].map((v) => (
                <option key={v} value={v}>{v} lb</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-500 dark:text-neutral-400">Sessions per week</span>
            <input
              type="number"
              inputMode="numeric"
              value={sessionsPerWeek}
              min={1}
              max={14}
              step={1}
              aria-label="Sessions per week"
              onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
              className={field}
            />
          </label>
        </div>

        <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full rounded-2xl bg-emerald-600 py-3 text-base font-bold text-white active:scale-[0.99] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
