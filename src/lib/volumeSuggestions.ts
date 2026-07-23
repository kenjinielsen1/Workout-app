// On-request volume suggestions (VOLUME_SUGGESTIONS.md). A user-initiated LOOKUP,
// not a nudge — the app never offers this; the user goes and gets it by tapping a
// muscle or exercise name. So being asked doesn't license prescribing: it licenses
// LISTING. Every output here is options or facts, never an instruction.
//
// Add side  → "what trains this muscle?" (a filtered catalog lookup)
// Reduce side → "what's contributing?" (the current hard-set breakdown)
//
// Safety (SCOPE_SAFETY.md): the ADD side is withheld under a pain freeze, fatigue
// flag, or planned deload — it returns the factual state and lists nothing. The
// reduce side (pure fact) is always available.

import type { Equipment, MovementPattern } from './types';

export interface CatalogExercise {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: Equipment;
  movement_pattern: MovementPattern;
  is_compound: boolean;
}

export interface ExerciseOption {
  id: string;
  name: string;
  primary: string[];
  secondary: string[];
}

export type AddResult =
  | { kind: 'options'; options: ExerciseOption[] }
  // The add side is withheld — factual state, nothing to add.
  | { kind: 'withheld'; reason: string };

export interface AddArgs {
  muscle: string;
  catalog: CatalogExercise[];
  /** Exercise ids already trained for this muscle this week — excluded. */
  doneThisWeek: Set<string>;
  /** Equipment the user has actually used (logged history / settings). */
  accessibleEquipment: Set<Equipment>;
  /** Movement patterns under an active pain freeze — never suggested. */
  frozenPatterns: Set<MovementPattern>;
  fatigueFlagged: boolean;
  plannedDeload: boolean;
}

/** Catalog exercises that train `muscle` as PRIMARY, minus current work, filtered
 *  to accessible equipment and away from frozen patterns. Plainly ordered
 *  (compound then isolation, then name) — not ranked by an opinion. Returns the
 *  factual state instead when the add side is withheld for safety. */
export function addOptions(a: AddArgs): AddResult {
  if (a.plannedDeload) {
    return { kind: 'withheld', reason: 'This is a planned deload week.' };
  }
  if (a.fatigueFlagged) {
    return { kind: 'withheld', reason: 'Training is flagged for fatigue right now.' };
  }

  const trainsMuscle = a.catalog.filter(
    (e) => e.primary_muscles.includes(a.muscle) && a.accessibleEquipment.has(e.equipment) && !a.doneThisWeek.has(e.id),
  );
  // Everything that trains it is under a pain freeze → factual state, nothing to add.
  const usable = trainsMuscle.filter((e) => !a.frozenPatterns.has(e.movement_pattern));
  if (trainsMuscle.length > 0 && usable.length === 0) {
    return { kind: 'withheld', reason: 'This movement pattern is currently frozen following a pain log.' };
  }

  const options = usable
    .slice()
    .sort((x, y) => Number(y.is_compound) - Number(x.is_compound) || x.name.localeCompare(y.name))
    .map((e) => ({ id: e.id, name: e.name, primary: e.primary_muscles, secondary: e.secondary_muscles }));
  return { kind: 'options', options };
}

export interface Contributor {
  id: string;
  name: string;
  /** Weighted hard sets to this muscle (primary 1.0, secondary 0.5 — VOLUME.md). */
  sets: number;
}

export interface ContributorInput {
  id: string;
  name: string;
  primary: string[];
  secondary: string[];
  hardSets: number;
}

/** What's currently contributing hard sets to `muscle`, ranked by contribution.
 *  Pure fact — it nominates nothing for removal. */
export function reduceContributors(muscle: string, week: ContributorInput[]): Contributor[] {
  return week
    .map((e) => ({
      id: e.id,
      name: e.name,
      sets: e.primary.includes(muscle) ? e.hardSets : e.secondary.includes(muscle) ? e.hardSets * 0.5 : 0,
    }))
    .filter((c) => c.sets > 0)
    .sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name));
}
