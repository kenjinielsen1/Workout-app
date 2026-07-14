// Weekly volume landmarks per muscle (VOLUME.md). Evidence-based STARTING PRIORS
// the app refines per user, exactly like the RIR calibration in PROGRESSION.md.
// Versioned config (EVIDENCE_CONFIG.md) — bump LANDMARKS_VERSION when the priors
// change so per-user calibration built on old priors can be reconciled.
//
//   MV   maintenance minimum      ~6
//   MEV  minimum for growth       ~8–10
//   MAV  adaptive sweet spot      ~10–20
//   MRV  max recoverable          ~20–24  (beyond → junk / regression)

import {
  CONFIG_VERSION,
  volumeCalibrationAlpha,
  volumeLandmarkDefault,
  volumeLandmarkOverrides,
} from './evidenceConfig';

/** Which evidence-config version these landmark priors came from. */
export const LANDMARKS_VERSION = CONFIG_VERSION;

export interface Landmarks {
  mv: number;
  mev: number;
  mav: number; // top of the productive sweet spot
  mrv: number;
}

/** Population-prior landmarks for a muscle (fine-grained catalog name), read from
 *  the evidence config: the default band plus any per-muscle deviation. */
export function landmarksFor(muscle: string): Landmarks {
  return { ...volumeLandmarkDefault(), ...(volumeLandmarkOverrides()[muscle] ?? {}) };
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
  const ALPHA = volumeCalibrationAlpha();
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
