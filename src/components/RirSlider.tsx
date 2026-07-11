interface RirSliderProps {
  value: number;
  onChange: (next: number) => void;
}

const LABELS: Record<number, string> = {
  0: 'failure',
  1: 'grind',
  2: 'solid',
  3: 'easy',
  4: 'fresh',
  5: 'very fresh',
};

/** Reps-in-reserve, 0–5. Raw self-report — the engine bias-corrects it later. */
export function RirSlider({ value, onChange }: RirSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor="rir"
          className="text-sm font-medium text-neutral-500 dark:text-neutral-400"
        >
          Reps in reserve
        </label>
        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          {value} RIR · {LABELS[value]}
        </span>
      </div>
      <input
        id="rir"
        type="range"
        min={0}
        max={5}
        step={1}
        value={value}
        aria-label="Reps in reserve"
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-3 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-emerald-600 dark:bg-neutral-700"
      />
      <div className="flex justify-between text-xs text-neutral-400">
        <span>0</span>
        <span>5</span>
      </div>
    </div>
  );
}
