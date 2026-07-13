// Kilogram display setting (UNITS.md). THE ONE RULE: all weight is stored in
// pounds, always; the engine, rounding math, ML features, and the 45 lb bar floor
// never see kg. Convert ONLY at the two edges — output (lb → kg for display) and
// input (kg → lb when logging) — through this module, nowhere else.

export type WeightUnit = 'lb' | 'kg';
export type PlateSystem = 'imperial' | 'metric';

export const LB_PER_KG = 2.2046226218;

// Metric loadable grid (UNITS.md): a 20 kg bar in 0.5 kg steps (0.25 kg plate
// pairs). "kg mode" is a different loadable grid, not round(lb × 0.4536).
export const BAR_KG = 20;
export const BARBELL_KG_STEP = 0.5;

export const kgToLb = (kg: number): number => kg * LB_PER_KG;
export const lbToKg = (lb: number): number => lb / LB_PER_KG;

/** Stored lb → the number to show, in the user's unit (unrounded). */
export const toDisplay = (lb: number, unit: WeightUnit): number =>
  unit === 'kg' ? lbToKg(lb) : lb;

/** A number the user typed in their unit → lb to store. */
export const fromInput = (value: number, unit: WeightUnit): number =>
  unit === 'kg' ? kgToLb(value) : value;

/**
 * Display value, rounded for readability. kg rounds to the plate grid (0.5 kg by
 * default); lb keeps its 2.5-grid precision. The stored lb value is the source of
 * truth and is NEVER re-derived from this rounded number (that would drift).
 */
export function roundDisplay(lb: number, unit: WeightUnit, kgStep = BARBELL_KG_STEP): number {
  if (unit === 'kg') {
    const kg = lbToKg(lb);
    return Number((Math.round(kg / kgStep) * kgStep).toFixed(4));
  }
  // lb weights already sit on the 2.5 grid; keep a hair of precision for effective loads.
  return Number(lb.toFixed(2));
}

/** Trim trailing zeros: 100.0 → "100", 102.5 → "102.5". */
function trim(n: number): string {
  return Number(n.toFixed(2)).toString();
}

/** Rounded display number as a string, no unit suffix. */
export function formatWeight(lb: number, unit: WeightUnit, kgStep = BARBELL_KG_STEP): string {
  return trim(roundDisplay(lb, unit, kgStep));
}

/** Rounded display number with its unit, e.g. "100 kg" / "225 lb". */
export function formatWeightUnit(lb: number, unit: WeightUnit, kgStep = BARBELL_KG_STEP): string {
  return `${formatWeight(lb, unit, kgStep)} ${unit}`;
}

/** The stepper increment to show for a given lb increment (converted, rounded). */
export function displayStep(lbStep: number, unit: WeightUnit): number {
  return unit === 'kg' ? Number(lbToKg(lbStep).toFixed(2)) : lbStep;
}

/** e1RM/tonnage-style display: whole numbers in the display unit. Matches the
 *  prior lb Math.round behavior exactly, so lb users are unchanged. */
export function formatE1RM(lb: number, unit: WeightUnit): string {
  return String(Math.round(toDisplay(lb, unit)));
}
