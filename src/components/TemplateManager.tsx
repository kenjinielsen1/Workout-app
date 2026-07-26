// Saved workouts (SAVED_WORKOUTS.md): a quiet lineup picker + editor. It is NOT a
// hero screen — templates are entirely optional, and the manual exercise-by-exercise
// flow stays first-class.
//
// Deliberately absent: any validation or warning at creation ("this has no pulling
// movements"). That's a prescription; the balance monitor already reports imbalance
// after the fact from real logged data.

import { useState } from 'react';
import type { WorkoutTemplate } from '../data/domain';
import { duplicateName, moveItem } from '../lib/workoutTemplates';
import { EmptyState } from './EmptyState';

export interface TemplateExerciseOption {
  id: string;
  name: string;
}

interface Props {
  templates: WorkoutTemplate[];
  /** The live catalog, for adding exercises and resolving names. */
  catalog: TemplateExerciseOption[];
  onStart: (t: WorkoutTemplate) => void;
  onSave: (input: { id?: string; name: string; exercise_ids: string[] }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function TemplateManager({ templates, catalog, onStart, onSave, onDelete, onClose }: Props) {
  const [editing, setEditing] = useState<{ id?: string; name: string; ids: string[] } | null>(null);
  const [query, setQuery] = useState('');
  const nameOf = (id: string) => catalog.find((c) => c.id === id)?.name ?? null;

  if (editing) {
    const matches = query.trim()
      ? catalog.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()) && !editing.ids.includes(c.id)).slice(0, 8)
      : [];
    return (
      <Shell onClose={onClose}>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setEditing(null)} className="text-sm font-semibold text-neutral-500">‹ Back</button>
          <h2 className="text-base font-bold">{editing.id ? 'Edit workout' : 'New workout'}</h2>
          <span className="w-10" />
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-500">Name</span>
          <input
            autoFocus
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            aria-label="Workout name"
            placeholder="Push A"
            className="rounded-xl bg-neutral-800 px-3 py-2 text-base"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-500">Exercises</span>
          {editing.ids.length === 0 ? (
            <p className="text-[13px] text-neutral-400">Add the lifts you do in this session. Weights and reps still come from your history each time.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {editing.ids.map((id, i) => (
                <li key={id} className="flex items-center gap-2 rounded-xl bg-neutral-800 px-3 py-2 text-sm">
                  <span className="w-5 shrink-0 tabular-nums text-neutral-500">{i + 1}</span>
                  <span className="flex-1 truncate">{nameOf(id) ?? 'Unavailable exercise'}</span>
                  <button type="button" aria-label={`Move ${nameOf(id) ?? id} up`} disabled={i === 0}
                    onClick={() => setEditing({ ...editing, ids: moveItem(editing.ids, i, i - 1) })}
                    className="px-1.5 text-neutral-400 disabled:opacity-30">↑</button>
                  <button type="button" aria-label={`Move ${nameOf(id) ?? id} down`} disabled={i === editing.ids.length - 1}
                    onClick={() => setEditing({ ...editing, ids: moveItem(editing.ids, i, i + 1) })}
                    className="px-1.5 text-neutral-400 disabled:opacity-30">↓</button>
                  <button type="button" aria-label={`Remove ${nameOf(id) ?? id}`}
                    onClick={() => setEditing({ ...editing, ids: editing.ids.filter((x) => x !== id) })}
                    className="px-1.5 text-neutral-400">✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-500">Add an exercise</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search exercises"
            placeholder="Search…"
            className="rounded-xl bg-neutral-800 px-3 py-2 text-base"
          />
        </label>
        {matches.length > 0 && (
          <ul className="flex flex-col">
            {matches.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => { setEditing({ ...editing, ids: [...editing.ids, m.id] }); setQuery(''); }}
                  className="w-full px-3 py-2 text-left text-sm active:bg-neutral-800">
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          disabled={!editing.name.trim() || editing.ids.length === 0}
          onClick={() => { onSave({ id: editing.id, name: editing.name, exercise_ids: editing.ids }); setEditing(null); }}
          className="mt-1 rounded-2xl bg-neutral-100 py-3 text-base font-bold text-neutral-900 active:scale-[0.99] disabled:opacity-50"
        >
          Save workout
        </button>
      </Shell>
    );
  }

  return (
    <Shell onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Saved workouts</h2>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-neutral-500">Done</button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          title="Save a workout to reuse it"
          body="Name a set of exercises you repeat — the app remembers the lineup, and works out the weights each time."
          action={{ label: 'New workout', onClick: () => setEditing({ name: '', ids: [] }) }}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {templates.map((t) => (
              <li key={t.id} className="flex flex-col gap-1.5 rounded-2xl border border-neutral-700 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => onStart(t)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold text-neutral-100">{t.name}</span>
                    <span className="block truncate text-xs text-neutral-500">
                      {t.exercise_ids.map((id) => nameOf(id) ?? 'Unavailable').join(' · ')}
                    </span>
                  </button>
                  <button type="button" onClick={() => onStart(t)}
                    className="shrink-0 rounded-xl bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-900 active:scale-95">
                    Start
                  </button>
                </div>
                <div className="flex gap-3 text-xs text-neutral-500">
                  <button type="button" onClick={() => setEditing({ id: t.id, name: t.name, ids: [...t.exercise_ids] })}>Edit</button>
                  <button type="button" onClick={() => onSave({ name: duplicateName(t.name, templates.map((x) => x.name)), exercise_ids: [...t.exercise_ids] })}>Duplicate</button>
                  <button type="button" onClick={() => onDelete(t.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setEditing({ name: '', ids: [] })}
            className="rounded-2xl border border-dashed border-neutral-700 py-3 text-sm font-semibold text-neutral-400 active:scale-[0.99]"
          >
            New workout
          </button>
        </>
      )}
    </Shell>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex bg-black/40" role="dialog" aria-label="Saved workouts" onClick={onClose}>
      <div
        className="mx-auto flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-neutral-900 p-4 sm:my-8 sm:h-auto sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
