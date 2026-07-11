// Fuzzy exercise resolution — "you type 'squat', we find Barbell Back Squat"
// rather than letting you create a duplicate and fragment your history on day three.
//
// Pure. Similarity is the Sørensen–Dice coefficient over character bigrams of the
// normalized string, which is forgiving of word order and minor typos and needs no
// database trigram index to prototype against. (Postgres pg_trgm does the same job
// server-side for the real search.)

export interface SearchableExercise {
  id: string;
  name: string;
  aliases: string[];
}

export interface Match<T> {
  exercise: T;
  score: number; // 0..1; 1 = exact normalized name/alias hit
}

/** Similarity threshold above which two exercise names are "the same lift". */
export const DUP_THRESHOLD = 0.8;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function bigrams(s: string): Map<string, number> {
  const compact = s.replace(/ /g, '');
  const grams = new Map<string, number>();
  for (let i = 0; i < compact.length - 1; i++) {
    const g = compact.slice(i, i + 2);
    grams.set(g, (grams.get(g) ?? 0) + 1);
  }
  return grams;
}

/** Sørensen–Dice on bigrams of the normalized strings. 1 = identical. */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const ga = bigrams(na);
  const gb = bigrams(nb);
  if (ga.size === 0 || gb.size === 0) return 0;
  let intersection = 0;
  for (const [g, count] of ga) {
    const other = gb.get(g);
    if (other) intersection += Math.min(count, other);
  }
  const total = [...ga.values()].reduce((a, b) => a + b, 0) + [...gb.values()].reduce((a, b) => a + b, 0);
  return (2 * intersection) / total;
}

/** Best similarity between a query and any of an exercise's name/aliases. */
function bestScore<T extends SearchableExercise>(query: string, ex: T): number {
  const nq = normalize(query);
  let best = similarity(nq, ex.name);
  // Exact alias/name hits short-circuit to a perfect score.
  if (normalize(ex.name) === nq) return 1;
  for (const alias of ex.aliases) {
    if (normalize(alias) === nq) return 1;
    best = Math.max(best, similarity(nq, alias));
  }
  return best;
}

/** Ranked matches for a free-text query, best first, above `minScore`. */
export function searchExercises<T extends SearchableExercise>(
  query: string,
  items: T[],
  limit = 8,
  minScore = 0.2,
): Match<T>[] {
  if (!normalize(query)) return [];
  return items
    .map((exercise) => ({ exercise, score: bestScore(query, exercise) }))
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** The single best match, or null if nothing is close enough. */
export function resolveExercise<T extends SearchableExercise>(
  query: string,
  items: T[],
  minScore = 0.4,
): Match<T> | null {
  const [top] = searchExercises(query, items, 1, minScore);
  return top ?? null;
}

/** Would creating `name` collide with an existing exercise? ("Did you mean …?") */
export function findDuplicate<T extends SearchableExercise>(
  name: string,
  items: T[],
): Match<T> | null {
  const top = resolveExercise(name, items, DUP_THRESHOLD);
  return top && top.score >= DUP_THRESHOLD ? top : null;
}
