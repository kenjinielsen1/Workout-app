// Weekly volume landmarks per muscle (VOLUME.md). Evidence-based STARTING PRIORS
// the app refines per user, exactly like the RIR calibration in PROGRESSION.md.
// Versioned config (EVIDENCE_CONFIG.md) — bump LANDMARKS_VERSION when the priors
// change so per-user calibration built on old priors can be reconciled.
//
//   MV   maintenance minimum      ~6
//   MEV  minimum for growth       ~8–10
//   MAV  adaptive sweet spot      ~10–20
//   MRV  max recoverable          ~20–24  (beyond → junk / regression)

export const LANDMARKS_VERSION = 1;

export interface Landmarks {
  mv: number;
  mev: number;
  mav: number; // top of the productive sweet spot
  mrv: number;
}

const DEFAULT: Landmarks = { mv: 6, mev: 9, mav: 16, mrv: 22 };

// Per-muscle deviations from the default prior. Small muscles that recover fast
// (side/rear delts, calves) tolerate more; the lower back (erectors) less.
const OVERRIDES: Record<string, Partial<Landmarks>> = {
  side_delts: { mev: 10, mav: 19, mrv: 26 },
  rear_delts: { mev: 10, mav: 19, mrv: 26 },
  calves: { mev: 8, mav: 18, mrv: 26 },
  forearms: { mev: 8, mav: 16, mrv: 25 },
  abs: { mev: 8, mav: 18, mrv: 25 },
  erectors: { mev: 6, mav: 10, mrv: 14 }, // lower back — recovers slowly
};

/** Population-prior landmarks for a muscle (fine-grained catalog name). */
export function landmarksFor(muscle: string): Landmarks {
  return { ...DEFAULT, ...(OVERRIDES[muscle] ?? {}) };
}

/**
 * Apply a learned per-user offset (in sets) to the whole band, keeping the
 * landmarks ordered and non-negative. A positive offset = this user tolerates
 * more volume than the prior.
 */
export function applyCalibration(base: Landmarks, offsetSets: number): Landmarks {
  const shift = (v: number) => Math.max(0, v + offsetSets);
  const mv = shift(base.mv);
  const mev = Math.max(mv, shift(base.mev));
  const mav = Math.max(mev, shift(base.mav));
  const mrv = Math.max(mav, shift(base.mrv));
  return { mv, mev, mav, mrv };
}

/**
 * Refine a user's MRV estimate from an observed week (VOLUME.md individual
 * calibration): sustained performance AT OR ABOVE the current estimate nudges it
 * up; a stall AT OR BELOW nudges it down. EWMA-style so a single week can't swing
 * it. Returns the new MRV estimate.
 */
export function updateMRVEstimate(
  priorMRV: number,
  observedVolume: number,
  performedWell: boolean,
): number {
  const ALPHA = 0.25;
  if (performedWell && observedVolume >= priorMRV) {
    // Held performance at/above the ceiling → the true ceiling is higher.
    return Number((priorMRV + ALPHA * (observedVolume + 1 - priorMRV)).toFixed(3));
  }
  if (!performedWell && observedVolume <= priorMRV) {
    // Stalled below the assumed ceiling → the true ceiling is lower.
    return Number((priorMRV + ALPHA * (observedVolume - priorMRV)).toFixed(3));
  }
  return priorMRV; // no clear signal → unchanged
}
