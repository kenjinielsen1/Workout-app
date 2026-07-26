// Saved workouts (SAVED_WORKOUTS.md) — named, reusable exercise lists.
//
// ARCHITECTURAL RULE: a template is exercises + order. Never weights, reps, or
// sets. Those come from the engine, fresh each session. This module's functions
// take ONLY exercise-id lists, so set counts / weights / reps are structurally
// invisible here — the "structural difference" guarantee is enforced by the types,
// not by discipline.
//
//   template → what am I doing today?
//   engine   → how heavy, how many.

export interface TemplateDiff {
  /** In the session but not the template. */
  added: string[];
  /** In the template but not the session. */
  removed: string[];
  /** Same exercise set, different order. */
  reordered: boolean;
  /** Any structural difference at all — the only trigger for the update prompt. */
  changed: boolean;
}

/**
 * Structural difference between a template's lineup and what was actually trained.
 *
 * Takes exercise IDS ONLY — it cannot see set counts, weights, reps, skipped sets,
 * or a failed set, so it can never fire on them. Duplicates are collapsed: training
 * an exercise twice in a session is not a structural change.
 */
export function structuralDiff(templateIds: string[], sessionIds: string[]): TemplateDiff {
  const tpl = dedupe(templateIds);
  const ses = dedupe(sessionIds);
  const tplSet = new Set(tpl);
  const sesSet = new Set(ses);

  const added = ses.filter((id) => !tplSet.has(id));
  const removed = tpl.filter((id) => !sesSet.has(id));
  // Reorder only means anything when the sets match; otherwise add/remove says it.
  const sameSet = added.length === 0 && removed.length === 0;
  const reordered = sameSet && tpl.some((id, i) => ses[i] !== id);

  return { added, removed, reordered, changed: added.length > 0 || removed.length > 0 || reordered };
}

/** First occurrence wins, so order is preserved. */
function dedupe(ids: string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
}

/** The lineup a session should adopt when the user accepts the update: exactly
 *  what they trained, in the order they trained it. */
export function lineupFromSession(sessionIds: string[]): string[] {
  return dedupe(sessionIds);
}

/** Move the item at `from` to `to`, returning a new array (reordering in the editor). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list.slice();
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** A copy for "duplicate template" — many programs are variations of each other. */
export function duplicateName(name: string, existing: string[]): string {
  const base = `${name} copy`;
  if (!existing.includes(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`;
    if (!existing.includes(candidate)) return candidate;
  }
}
