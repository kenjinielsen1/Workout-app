import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as cfg from './evidenceConfig';
import {
  SIGNAL_WEIGHTS,
  READINESS_INCREASE,
  READINESS_ADD_REP,
  correctedRIR,
  expectedWeeklyGain,
  repRangeForGoal,
  targetRIRForGoal,
  type ProgProfile,
} from './progression';
import { applyCalibration, landmarksFor } from './volumeLandmarks';
import rawConfig from '../config/evidence-config.v1.json';

const PARAMS = rawConfig.parameters as Record<string, { source?: string; note?: string; confidence?: string }>;

describe('evidence config integrity (EVIDENCE_CONFIG.md)', () => {
  it('every parameter carries a value, source, note, and confidence level', () => {
    for (const [name, p] of Object.entries(PARAMS)) {
      expect(p, name).toHaveProperty('value');
      expect(p.source, name).toBeTruthy();
      expect(p.note, name).toBeTruthy();
      expect(['high', 'moderate', 'limited'], name).toContain(p.confidence);
    }
  });

  it('exposes the version and per-parameter confidence for the UI', () => {
    expect(cfg.CONFIG_VERSION).toBe(rawConfig.version);
    expect(cfg.paramConfidence('proximity_target_rir')).toBe('high');
    expect(cfg.paramConfidence('readiness_thresholds')).toBe('limited'); // reflects genuine uncertainty
  });
});

describe('engine reads come FROM the config (provenance)', () => {
  it('exported engine constants equal their config values', () => {
    expect(SIGNAL_WEIGHTS).toEqual(cfg.signalWeights());
    expect(READINESS_INCREASE).toBe(cfg.readinessThresholds().increase);
    expect(READINESS_ADD_REP).toBe(cfg.readinessThresholds().addRep);
  });

  it('engine functions return the config-derived values', () => {
    expect(targetRIRForGoal('strength')).toBe(cfg.targetRIR('strength')); // midpoint of [3,5] = 4
    expect(repRangeForGoal('hypertrophy', true)).toEqual(cfg.repRange('hypertrophy', true));
    const novice: ProgProfile = { bodyweight_lb: 180, has_micro_plates: true, dumbbell_increment_lb: 5, goal: 'hypertrophy', training_age_months: 3 };
    expect(expectedWeeklyGain(novice)).toBe(cfg.expectedWeeklyGain(3));
  });
});

describe('no research-derived numeric literal remains in engine code (grep guard)', () => {
  const ENGINE_FILES = ['src/lib/progression.ts', 'src/lib/blend.ts', 'src/lib/volume.ts', 'src/lib/volumeLandmarks.ts'];
  // Distinctive values that live ONLY in the evidence config now. If any reappears
  // inlined in the engine, the config has been bypassed.
  const FORBIDDEN = ['3.5', '1.8', '1.05', '0.004', '0.002', '0.05'];

  it('none of the engine files inline a config-owned evidence number', () => {
    for (const file of ENGINE_FILES) {
      const src = readFileSync(file, 'utf8');
      for (const lit of FORBIDDEN) {
        expect(src.includes(lit), `${file} inlines evidence literal ${lit}`).toBe(false);
      }
    }
  });

  it('every engine file routes through the evidence config accessor', () => {
    for (const file of ENGINE_FILES) {
      expect(readFileSync(file, 'utf8')).toMatch(/evidenceConfig/);
    }
  });
});

describe('per-user calibration offsets are deltas FROM the config priors', () => {
  const base: ProgProfile = { bodyweight_lb: 180, has_micro_plates: true, dumbbell_increment_lb: 5, goal: 'hypertrophy', training_age_months: 36 };

  it('a trusted RIR offset shifts the corrected value by exactly the offset, whatever the prior', () => {
    const trusted = { rir_calibration_n: 4 }; // ≥ trust threshold so the offset applies
    const withOffset = correctedRIR(2, { ...base, ...trusted, rir_calibration_offset: 1.5 }, 8);
    const noOffset = correctedRIR(2, { ...base, ...trusted, rir_calibration_offset: 0 }, 8);
    expect(noOffset - withOffset).toBeCloseTo(1.5, 9); // offset is a pure delta → survives a prior bump
  });

  it('a volume-landmark offset shifts the whole band by the offset, preserving personal calibration', () => {
    const prior = landmarksFor('pectorals');
    const calibrated = applyCalibration(prior, 3);
    expect(calibrated.mrv).toBe(prior.mrv + 3);
    expect(calibrated.mev).toBe(prior.mev + 3);
  });
});
