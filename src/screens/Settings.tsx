import { useState } from 'react';
import type { Goal } from '../lib/types';
import type { Profile } from '../data/domain';
import { fromInput, roundDisplay, type PlateSystem, type WeightUnit } from '../lib/units';

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
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [trainingAge, setTrainingAge] = useState(bucketForMonths(profile.training_age_months));
  const [microPlates, setMicroPlates] = useState(profile.has_micro_plates);
  const [dumbbellIncrement, setDumbbellIncrement] = useState(profile.dumbbell_increment_lb);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(profile.sessions_per_week ?? 3);
  const [warmupEnabled, setWarmupEnabled] = useState(profile.warmup_enabled);
  const [periodizationEnabled, setPeriodizationEnabled] = useState(profile.periodization_enabled);
  const [unit, setUnit] = useState<WeightUnit>(profile.weight_unit);
  const [plateSystem, setPlateSystem] = useState<PlateSystem>(profile.plate_system);
  // Bodyweight is edited in the display unit; stored in lb.
  const [bodyweightDisplay, setBodyweightDisplay] = useState(roundDisplay(profile.bodyweight_lb, profile.weight_unit));
  const [saving, setSaving] = useState(false);

  // Switching to kg defaults the plate system to metric (and lb → imperial), but
  // the two stay independent so a kg readout on imperial equipment is possible.
  const changeUnit = (u: WeightUnit) => {
    setBodyweightDisplay(roundDisplay(fromInput(bodyweightDisplay, unit), u));
    setUnit(u);
    setPlateSystem(u === 'kg' ? 'metric' : 'imperial');
  };

  const save = async () => {
    setSaving(true);
    await onSave({
      bodyweight_lb: fromInput(bodyweightDisplay, unit),
      goal,
      training_age_months: trainingAge,
      has_micro_plates: microPlates,
      dumbbell_increment_lb: dumbbellIncrement,
      sessions_per_week: sessionsPerWeek,
      warmup_enabled: warmupEnabled,
      weight_unit: unit,
      plate_system: plateSystem,
      periodization_enabled: periodizationEnabled,
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
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-500 dark:text-neutral-400">Units</span>
            <div className="flex gap-1.5" role="group" aria-label="Weight unit">
              {(['lb', 'kg'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => changeUnit(u)}
                  aria-pressed={unit === u}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                    unit === u ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {u === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
                </button>
              ))}
            </div>
            <span className="text-xs text-neutral-400">Display only — everything is stored in pounds; nothing is converted in the engine.</span>
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-500 dark:text-neutral-400">Plates</span>
            <div className="flex gap-1.5" role="group" aria-label="Plate system">
              {(['imperial', 'metric'] as const).map((ps) => (
                <button
                  key={ps}
                  type="button"
                  onClick={() => setPlateSystem(ps)}
                  aria-pressed={plateSystem === ps}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                    plateSystem === ps ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {ps === 'imperial' ? '45 lb bar' : '20 kg bar'}
                </button>
              ))}
            </div>
            <span className="text-xs text-neutral-400">Which bar + plates you actually load. Targets snap to this grid.</span>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-500 dark:text-neutral-400">Bodyweight ({unit})</span>
            <input
              type="number"
              inputMode="decimal"
              value={bodyweightDisplay}
              min={0}
              step={1}
              aria-label="Bodyweight"
              onChange={(e) => setBodyweightDisplay(Number(e.target.value))}
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

          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="flex flex-col">
              <span className="font-medium">Planned periodization</span>
              <span className="text-xs text-neutral-400">Waves hard, intensity, and deload weeks so you stall less. Off = pure session-to-session progression.</span>
            </span>
            <input
              type="checkbox"
              checked={periodizationEnabled}
              aria-label="Planned periodization"
              onChange={(e) => setPeriodizationEnabled(e.target.checked)}
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
