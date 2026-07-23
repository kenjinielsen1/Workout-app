import { useMemo, useState } from 'react';
import { findDuplicate, searchExercises, type Match } from '../lib/exerciseSearch';
import {
  groupExercisesByMuscle,
  groupForExercise,
  MUSCLE_GROUP_ORDER,
  MUSCLES_IN_GROUP,
  prettyMuscleName,
  type MuscleGroup,
} from '../lib/muscleGroups';
import { buildNewExercise, EQUIPMENT_OPTIONS } from '../lib/newExercise';
import type { CreateExerciseInput } from '../data/domain';
import type { Equipment } from '../lib/types';

export interface PickerExercise {
  id: string;
  name: string;
  primary_muscles: string[];
  aliases: string[];
  /** User-owned exercises can be edited (fix muscle/equipment/name). */
  editable?: boolean;
  equipment?: Equipment;
}

interface ExercisePickerProps {
  exercises: PickerExercise[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: (input: CreateExerciseInput) => void;
  /** Save edits to a user-owned exercise. */
  onEdit?: (id: string, input: CreateExerciseInput) => void;
  onClose: () => void;
}

export function ExercisePicker({ exercises, selectedId, onSelect, onCreate, onEdit, onClose }: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<'All' | MuscleGroup>('All');
  const [mode, setMode] = useState<'browse' | 'create'>('browse');

  // create/edit form state — editingId set = editing an existing exercise.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [primaryMuscle, setPrimaryMuscle] = useState<string>('pectorals');
  const [dup, setDup] = useState<Match<PickerExercise> | null>(null);

  const startEdit = (ex: PickerExercise) => {
    setEditingId(ex.id);
    setName(ex.name);
    setEquipment(ex.equipment ?? 'barbell');
    setPrimaryMuscle(ex.primary_muscles[0] ?? 'pectorals');
    setDup(null);
    setMode('create');
  };

  const grouped = useMemo(() => groupExercisesByMuscle(exercises), [exercises]);
  const groupsPresent = useMemo(() => grouped.map((g) => g.group), [grouped]);

  const searching = query.trim().length > 0;
  const results = useMemo(
    () => (searching ? searchExercises(query, exercises, 30, 0.15).map((m) => m.exercise) : []),
    [searching, query, exercises],
  );
  const visibleGroups = useMemo(
    () => (activeGroup === 'All' ? grouped : grouped.filter((g) => g.group === activeGroup)),
    [grouped, activeGroup],
  );

  const choose = (id: string) => {
    onSelect(id);
    onClose();
  };

  const openCreate = (prefill = '') => {
    setEditingId(null);
    setName(prefill);
    setEquipment('barbell');
    setPrimaryMuscle('pectorals');
    setDup(null);
    setMode('create');
  };

  const submitCreate = (force = false) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const input = buildNewExercise({ name: trimmed, equipment, primaryMuscle });
    if (editingId) {
      onEdit?.(editingId, input); // editing an existing lift — no duplicate check
      onClose();
      return;
    }
    const match = findDuplicate(trimmed, exercises);
    if (match && !force) {
      setDup(match); // "Did you mean …?"
      return;
    }
    onCreate(input);
    onClose();
  };

  const Row = ({ ex }: { ex: PickerExercise }) => (
    <div
      className={`flex w-full items-center gap-1 pr-2 ${
        ex.id === selectedId ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'active:bg-neutral-100 dark:active:bg-neutral-800'
      }`}
    >
      <button type="button" onClick={() => choose(ex.id)} className="flex flex-1 items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="font-medium">{ex.name}</span>
        <span className="shrink-0 text-xs text-neutral-400">{groupForExercise(ex)}</span>
      </button>
      {ex.editable && onEdit && (
        <button
          type="button"
          onClick={() => startEdit(ex)}
          aria-label={`Edit ${ex.name}`}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-400 active:scale-95"
        >
          Edit
        </button>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/40"
      role="dialog"
      aria-label="Choose exercise"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="mx-auto flex h-full w-full max-w-md flex-col bg-white dark:bg-neutral-900 sm:my-8 sm:h-auto sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {mode === 'create' ? (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => { setEditingId(null); setMode('browse'); }} className="text-sm font-semibold text-neutral-500">
                ‹ Back
              </button>
              <h2 className="text-base font-bold">{editingId ? 'Edit exercise' : 'New exercise'}</h2>
              <span className="w-10" />
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-500 dark:text-neutral-400">Name</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => { setName(e.target.value); setDup(null); }}
                placeholder="e.g. Cable Y-Raise"
                aria-label="Exercise name"
                className="rounded-xl bg-neutral-100 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-500 dark:text-neutral-400">Equipment</span>
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value as Equipment)}
                aria-label="Equipment"
                className="rounded-xl bg-neutral-100 px-3 py-2 text-base dark:bg-neutral-800"
              >
                {EQUIPMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-500 dark:text-neutral-400">Primary muscle</span>
              <select
                value={primaryMuscle}
                onChange={(e) => setPrimaryMuscle(e.target.value)}
                aria-label="Primary muscle"
                className="rounded-xl bg-neutral-100 px-3 py-2 text-base dark:bg-neutral-800"
              >
                {MUSCLE_GROUP_ORDER.filter((g) => MUSCLES_IN_GROUP[g].length > 0).map((g) => (
                  <optgroup key={g} label={g}>
                    {MUSCLES_IN_GROUP[g].map((m) => (
                      <option key={m} value={m}>{prettyMuscleName(m)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="text-xs text-neutral-400">Sets you log count toward this muscle's weekly volume.</span>
            </label>

            {dup && (
              <div className="flex flex-col gap-2 rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950/40">
                <span className="text-amber-800 dark:text-amber-300">
                  Did you mean <strong>{dup.exercise.name}</strong>? Using it keeps your history together.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => choose(dup.exercise.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white"
                  >
                    Use {dup.exercise.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => submitCreate(true)}
                    className="rounded-lg bg-neutral-200 px-3 py-1.5 font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                  >
                    Create anyway
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => submitCreate(false)}
              disabled={!name.trim()}
              className="mt-2 rounded-2xl bg-neutral-100 py-3 text-base font-bold text-neutral-900 active:scale-[0.99] disabled:opacity-50"
            >
              {editingId ? 'Save changes' : 'Add exercise'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exercises…"
                aria-label="Search exercises"
                className="flex-1 rounded-xl bg-neutral-100 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800"
              />
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                Cancel
              </button>
            </div>

            {!searching && (
              <div className="flex gap-1.5 overflow-x-auto border-b border-neutral-200 p-2 dark:border-neutral-800">
                {(['All', ...MUSCLE_GROUP_ORDER.filter((g) => groupsPresent.includes(g))] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setActiveGroup(g)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                      activeGroup === g ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {searching ? (
                results.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 p-6 text-center text-sm text-neutral-400">
                    <span>No matches for “{query.trim()}”.</span>
                    <button
                      type="button"
                      onClick={() => openCreate(query.trim())}
                      className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white"
                    >
                      Create “{query.trim()}”
                    </button>
                  </div>
                ) : (
                  <ul>
                    {results.map((ex) => (
                      <li key={ex.id}><Row ex={ex} /></li>
                    ))}
                  </ul>
                )
              ) : (
                visibleGroups.map(({ group, exercises: exs }) => (
                  <section key={group}>
                    <h3 className="sticky top-0 bg-neutral-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                      {group}
                    </h3>
                    <ul>
                      {exs.map((ex) => (
                        <li key={ex.id}><Row ex={ex} /></li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>

            <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => openCreate(searching ? query.trim() : '')}
                className="w-full rounded-2xl border border-dashed border-neutral-300 py-3 text-sm font-semibold text-neutral-600 active:scale-[0.99] dark:border-neutral-700 dark:text-neutral-300"
              >
                ＋ New exercise
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
