interface NumberStepperProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  step: number;
  min?: number;
  unit?: string;
  'data-testid'?: string;
}

/** Large, thumb-friendly +/- stepper with a directly editable value. */
export function NumberStepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  unit,
  ...rest
}: NumberStepperProps) {
  const clamp = (n: number) => Math.max(min, Number(n.toFixed(4)));
  const dec = () => onChange(clamp(value - step));
  const inc = () => onChange(clamp(value + step));

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          aria-label={`decrease ${label}`}
          onClick={dec}
          className="w-16 rounded-2xl bg-neutral-200 text-3xl font-semibold text-neutral-800 active:scale-95 dark:bg-neutral-700 dark:text-neutral-100"
        >
          −
        </button>
        <div className="flex flex-1 items-baseline justify-center gap-1 rounded-2xl bg-neutral-100 px-3 py-4 dark:bg-neutral-800">
          <input
            type="number"
            inputMode="decimal"
            aria-label={label}
            data-testid={rest['data-testid']}
            value={value}
            step={step}
            min={min}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            className="w-full bg-transparent text-center text-5xl font-bold tabular-nums text-neutral-900 outline-none dark:text-neutral-50"
          />
          {unit && (
            <span className="text-lg font-medium text-neutral-400">{unit}</span>
          )}
        </div>
        <button
          type="button"
          aria-label={`increase ${label}`}
          onClick={inc}
          className="w-16 rounded-2xl bg-neutral-200 text-3xl font-semibold text-neutral-800 active:scale-95 dark:bg-neutral-700 dark:text-neutral-100"
        >
          +
        </button>
      </div>
    </div>
  );
}
