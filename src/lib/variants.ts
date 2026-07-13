// Exercise-variation support for the plateau breaker (FEATURES.md #5). Variants
// are the `variant_of` family: depth-1, so a family is one root plus its direct
// variants. Swapping to a close variant (back squat → pause / safety-bar squat)
// breaks a neural rut; the variant carries its own e1RM curve.

export interface VariantExercise {
  id: string;
  name: string;
  variant_of: string | null;
}

/** The other exercises in `ex`'s variant family (its root + siblings + children),
 *  excluding `ex` itself. Empty when the exercise stands alone. */
export function variantsOf<E extends VariantExercise>(ex: E, all: E[]): E[] {
  const rootId = ex.variant_of ?? ex.id; // the family root
  return all.filter((e) => e.id !== ex.id && (e.id === rootId || e.variant_of === rootId));
}

/** Suggested starting load for a variant from the current lift's e1RM. Variants
 *  express ~85–90% of the parent movement, so seed at 87% (SPEC/FEATURES ~85–90%). */
export function variantSeedE1RM(currentE1RM: number): number {
  return currentE1RM * 0.87;
}
