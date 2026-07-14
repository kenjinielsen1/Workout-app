import { describe, expect, it } from 'vitest';
import {
  allSafetyMessages,
  containsDiagnosticLanguage,
  evidenceCaveat,
  overreachNudge,
  painFreezesExercise,
  painReferral,
  PROFESSIONAL_REFERRAL_MESSAGE,
  restFraming,
  specialPopulationMessage,
  type PainFlag,
} from './safety';

const flag = (exercise_id: string, performed_at: string, type: 'muscular' | 'joint_sharp' = 'muscular'): PainFlag => ({ exercise_id, performed_at, type });

describe('pain → professional referral (SCOPE_SAFETY.md)', () => {
  it('refers when the same movement is flagged past the session threshold', () => {
    const flags = [flag('bench', '2026-07-01'), flag('bench', '2026-07-04'), flag('bench', '2026-07-08')];
    expect(painReferral(flags).refer).toBe(true);
  });

  it('does not refer on a single muscular pain flag', () => {
    expect(painReferral([flag('bench', '2026-07-01')]).refer).toBe(false);
  });

  it('refers immediately on sharp/joint pain', () => {
    expect(painReferral([flag('squat', '2026-07-01', 'joint_sharp')]).refer).toBe(true);
  });

  it('refers immediately on a red-flag pattern (numbness/radiating/rest pain)', () => {
    expect(painReferral([], { numbness: true }).refer).toBe(true);
    expect(painReferral([], { radiating: true }).refer).toBe(true);
    expect(painReferral([], { painAtRest: true }).refer).toBe(true);
  });

  it('the referral message states the boundary without diagnosing or alarming', () => {
    expect(PROFESSIONAL_REFERRAL_MESSAGE).toMatch(/not a clinician/i);
    expect(containsDiagnosticLanguage(PROFESSIONAL_REFERRAL_MESSAGE)).toBe(false);
  });
});

describe('pain freezes progression, full stop', () => {
  it('any logged pain freezes the exercise; no pain does not', () => {
    expect(painFreezesExercise('muscular')).toBe(true);
    expect(painFreezesExercise('joint_sharp')).toBe(true);
    expect(painFreezesExercise(null)).toBe(false);
  });
});

describe('no diagnostic language is ever emitted (guard)', () => {
  it('every safety message is free of condition names and diagnostic phrasing', () => {
    for (const msg of allSafetyMessages()) {
      expect(containsDiagnosticLanguage(msg), msg).toBe(false);
    }
  });

  it('the guard actually catches diagnostic language', () => {
    expect(containsDiagnosticLanguage('that sounds like tendinitis')).toBe(true);
    expect(containsDiagnosticLanguage('do these stretches to fix it')).toBe(true);
    expect(containsDiagnosticLanguage('same weight, aim for 6 reps')).toBe(false);
  });
});

describe('over-reaching nudge — supportive, never encouragement', () => {
  it('fires on repeated upward overrides and reinforces recovery', () => {
    const msg = overreachNudge({ upwardOverrides: 3, consecutiveDaysNoRest: 0, ignoredDeloads: 0 });
    expect(msg).toBeTruthy();
    expect(msg!).toMatch(/recovery is when adaptation/i);
    expect(msg!.toLowerCase()).not.toMatch(/push through|keep going|more is better/);
  });

  it('fires on a long no-rest streak and on ignored deloads', () => {
    expect(overreachNudge({ upwardOverrides: 0, consecutiveDaysNoRest: 14, ignoredDeloads: 0 })).toBeTruthy();
    expect(overreachNudge({ upwardOverrides: 0, consecutiveDaysNoRest: 0, ignoredDeloads: 2 })).toBeTruthy();
  });

  it('stays quiet when training is within the plan', () => {
    expect(overreachNudge({ upwardOverrides: 1, consecutiveDaysNoRest: 3, ignoredDeloads: 0 })).toBeNull();
  });
});

describe('rest is prescribed, never a failure', () => {
  it('frames rest positively and never implies a broken streak or failure', () => {
    const t = restFraming().toLowerCase();
    expect(t).toMatch(/prescribed|plan working/);
    expect(t).not.toMatch(/failed|missed|broke|penalt/);
    expect(t).toMatch(/no streak/);
  });
});

describe('special populations → general info + referral, no tailoring', () => {
  it('gives general-information framing and routes to a professional', () => {
    const msg = specialPopulationMessage('pregnancy');
    expect(msg).toMatch(/general information only/i);
    expect(msg).toMatch(/qualified professional/i);
    expect(containsDiagnosticLanguage(msg)).toBe(false);
  });
});

describe('honest evidence boundary', () => {
  it('adds a lighter-touch caveat for detrained returns and special cases', () => {
    expect(evidenceCaveat({ daysSinceLast: 30 })).toMatch(/layoff|conservativ/i);
    expect(evidenceCaveat({ special: true })).toMatch(/confidence is lower/i);
    expect(evidenceCaveat({ daysSinceLast: 3 })).toBeNull(); // no false caveat for a normal week
  });
});
