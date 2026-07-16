interface NumberStepperProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  step: number;
  min?: number;
  unit?: string;
  /** 'hero' makes the value the dominant object on the screen — the working
   *  weight at ~96px (DESIGN.md rule 1). 'default' is a normal instrument. */
  size?: 'default' | 'hero';
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
  size = 'default',
  ...rest
}: NumberStepperProps) {
  const clamp = (n: number) => Math.max(min, Number(n.toFixed(4)));
  const dec = () => onChange(clamp(value - step));
  const inc = () => onChange(clamp(value + step));
  const hero = size === 'hero';

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          aria-label={`decrease ${label}`}
          onClick={dec}
          className={`${hero ? 'w-16 text-4xl' : 'w-16 text-3xl'} rounded-2xl bg-neutral-700 font-semibold text-neutral-200 active:scale-95`}
        >
          −
        </button>
        <div className="flex flex-1 items-baseline justify-center gap-1.5 rounded-2xl bg-neutral-800 px-3 py-4">
          <input
            type="number"
            inputMode="decimal"
            aria-label={label}
            data-testid={rest['data-testid']}
            value={value}
            step={step}
            min={min}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            className={`w-full bg-transparent text-center font-bold tabular-nums text-neutral-50 outline-none ${
              hero
                ? 'text-[clamp(64px,22vw,96px)] leading-[0.82] tracking-[-0.04em]'
                : 'text-5xl'
            }`}
          />
          {unit && (
            <span className={`font-medium text-neutral-400 ${hero ? 'text-xl' : 'text-lg'}`}>{unit}</span>
          )}
        </div>
        <button
          type="button"
          aria-label={`increase ${label}`}
          onClick={inc}
          className={`${hero ? 'w-16 text-4xl' : 'w-16 text-3xl'} rounded-2xl bg-neutral-700 font-semibold text-neutral-200 active:scale-95`}
        >
          +
        </button>
      </div>
    </div>
  );
}
