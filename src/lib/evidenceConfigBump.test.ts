// A config bump changes engine output with NO code change: mock the evidence
// accessor and confirm the engine reflects the new value (EVIDENCE_CONFIG.md).
import { describe, expect, it, vi } from 'vitest';

vi.mock('./evidenceConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./evidenceConfig')>();
  return {
    ...actual,
    // Simulate a new config version that widened the strength rep range and moved
    // the hypertrophy proximity target.
    repRange: (goal: string, isCompound: boolean) =>
      goal === 'strength' && isCompound ? { min: 4, max: 8 } : actual.repRange(goal as never, isCompound),
    targetRIR: (goal: string) => (goal === 'hypertrophy' ? 1 : actual.targetRIR(goal as never)),
  };
});

// Import AFTER the mock so the engine binds to the mocked accessor.
const { repRangeForGoal, targetRIRForGoal } = await import('./progression');

describe('bumping a config value changes engine output without a code change', () => {
  it('the strength compound rep range now follows the (mocked) config', () => {
    expect(repRangeForGoal('strength', true)).toEqual({ min: 4, max: 8 }); // was {3,6}
  });

  it('the hypertrophy target RIR now follows the (mocked) config', () => {
    expect(targetRIRForGoal('hypertrophy')).toBe(1); // was 2
  });
});
