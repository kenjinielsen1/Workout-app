// Choose how a lift's sets are laid out. A scheme shapes the SESSION; it never
// decides how heavy the top set is — that stays the engine's job, from real logged
// history. The preview makes that concrete: set one is always the engine's number.

import { useState } from 'react';
import { describePyramid, STRAIGHT, type SetScheme } from '../lib/setSchemes';
import { formatWeightUnit, fromInput, roundDisplay, type WeightUnit } from '../lib/units';
import type { Equipment, LoadType } from '../lib/types';

interface PromptExercise {
  name: string;
  equipment: Equipment;
  load_type: LoadType;
  default_increment_lb: number;
  weight_increment_lb?: number | null;
  weight_stack_min_lb?: number | null;
}

interface Props {
  exercise: PromptExercise;
  profile: { has_micro_plates: boolean; dumbbell_increment_lb: number };
  /** The engine's top set, so the preview shows real numbers. */
  topWeightLb: number;
  topReps: number;
  sets: number;
  scheme?: SetScheme;
  unit?: WeightUnit;
  onSave: (next: SetScheme) => void;
  onClose: () => void;
}

export function SetSchemePrompt({
  exercise, profile, topWeightLb, topReps, sets, scheme, unit = 'lb', onSave, onClose,
}: Props) {
  const isPyramid = scheme?.kind === 'reverse_pyramid';
  const [kind, setKind] = useState(isPyramid ? 'reverse_pyramid' : 'straight');
  // Edited in the DISPLAY unit; converted to lb on save (UNITS.md).
  const [drop, setDrop] = useState(String(roundDisplay(scheme?.dropLb ?? fromInput(10, unit), unit)));
  const [reps, setReps] = useState(String(scheme?.repStep ?? 2));

  const dropLb = fromInput(Number(drop), unit);
  const repStep = Number(reps);
  const valid = Number.isFinite(dropLb) && dropLb > 0 && Number.isFinite(repStep) && repStep >= 0;
  const field = 'rounded-xl bg-neutral-800 px-3 py-2 text-base tabular-nums';

  const preview =
    kind === 'reverse_pyramid' && valid
      ? describePyramid({
          topWeightLb, topReps, sets, scheme: { kind: 'reverse_pyramid', dropLb, repStep },
          exercise, profile, format: (lb) => formatWeightUnit(lb, unit),
        })
      : `${formatWeightUnit(topWeightLb, unit)} × ${topReps}, every set`;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 sm:items-center" role="dialog" aria-label="Set scheme" onClick={onClose}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-t-2xl bg-neutral-900 p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-neutral-100">Sets — {exercise.name}</h2>
          <p className="text-sm leading-snug text-neutral-400">
            How this lift's sets are laid out. Your working weight still comes from
            your history — this only shapes the sets after the first.
          </p>
        </div>

        <div className="flex gap-2">
          {([['straight', 'Straight'], ['reverse_pyramid', 'Reverse pyramid']] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
                kind === k ? 'bg-neutral-100 text-neutral-900' : 'border border-neutral-700 text-neutral-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {kind === 'reverse_pyramid' && (
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-500">Drop per set ({unit})</span>
              <input type="number" inputMode="decimal" min={0} step={0.5} value={drop}
                aria-label="Drop per set" onChange={(e) => setDrop(e.target.value)} className={field} />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-500">Reps added</span>
              <input type="number" inputMode="numeric" min={0} step={1} value={reps}
                aria-label="Reps added per set" onChange={(e) => setReps(e.target.value)} className={field} />
            </label>
          </div>
        )}

        <div className="flex flex-col gap-0.5 rounded-xl bg-neutral-800 px-3 py-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Today would be</span>
          <span className="text-sm tabular-nums text-neutral-200">{preview}</span>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-2xl border border-neutral-600 py-3 font-semibold text-neutral-200 active:scale-[0.99]">
            Cancel
          </button>
          <button
            type="button"
            disabled={kind === 'reverse_pyramid' && !valid}
            onClick={() => onSave(kind === 'straight' ? STRAIGHT : { kind: 'reverse_pyramid', dropLb, repStep })}
            className="flex-1 rounded-2xl bg-neutral-100 py-3 font-bold text-neutral-900 active:scale-[0.99] disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
