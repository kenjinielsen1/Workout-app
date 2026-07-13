import { describe, expect, it } from 'vitest';
import { variantSeedE1RM, variantsOf, type VariantExercise } from './variants';

const catalog: VariantExercise[] = [
  { id: 'squat', name: 'Back Squat', variant_of: null },
  { id: 'pause-squat', name: 'Pause Squat', variant_of: 'squat' },
  { id: 'ssb-squat', name: 'Safety-Bar Squat', variant_of: 'squat' },
  { id: 'bench', name: 'Bench Press', variant_of: null }, // unrelated
];

describe('variantsOf', () => {
  it('from the root, returns its direct variants', () => {
    const root = catalog[0]!;
    expect(variantsOf(root, catalog).map((e) => e.id).sort()).toEqual(['pause-squat', 'ssb-squat']);
  });

  it('from a variant, returns the root and its siblings (not itself)', () => {
    const pause = catalog[1]!;
    expect(variantsOf(pause, catalog).map((e) => e.id).sort()).toEqual(['squat', 'ssb-squat']);
  });

  it('returns empty for a standalone exercise with no family', () => {
    const bench = catalog[3]!;
    expect(variantsOf(bench, catalog)).toEqual([]);
  });
});

describe('variantSeedE1RM', () => {
  it('seeds a variant at ~87% of the current e1RM', () => {
    expect(variantSeedE1RM(300)).toBeCloseTo(261, 6);
  });
});
