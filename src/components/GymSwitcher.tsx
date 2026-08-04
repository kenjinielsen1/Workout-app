// The gym control (MULTI_GYM.md). Deliberately quiet and secondary — a label, not
// a hero element. On a normal day at your home gym it should be nearly invisible,
// and a user who never travels sees only a single unobtrusive line.
//
// There is NO prompt at session start: the home gym is simply selected. Switching
// is a deliberate act, and the selection persists until changed.

import { useState } from 'react';
import type { Gym } from '../data/domain';

interface Props {
  gyms: Gym[];
  currentId: string | null;
  /** One quiet confirmation when a non-home selection has gone stale. */
  confirmStale: boolean;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onDismissConfirm: () => void;
}

export function GymSwitcher({ gyms, currentId, confirmStale, onSelect, onAdd, onDismissConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState('');
  const current = gyms.find((g) => g.id === currentId) ?? null;

  // A single-gym user gets nothing to look at.
  if (gyms.length <= 1 && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-neutral-500 hover:underline">
        {current?.name ?? 'Gym'}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Gym" className="text-xs text-neutral-400 hover:underline">
          {current?.name ?? 'Gym'} ▾
        </button>
        {confirmStale && current && (
          <span role="status" className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            Still at {current.name}?
            <button type="button" onClick={onDismissConfirm} className="font-semibold text-neutral-400">OK</button>
          </span>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-1 rounded-xl border border-neutral-700 p-2">
          {gyms.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => { onSelect(g.id); setOpen(false); }}
              className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs ${
                g.id === currentId ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400'
              }`}
            >
              <span>{g.name}</span>
              {g.is_home && <span className="text-[10px] text-neutral-500">home</span>}
            </button>
          ))}
          <div className="flex gap-1 pt-1">
            <input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              aria-label="New gym name"
              placeholder="Add a gym"
              className="min-w-0 flex-1 rounded-lg bg-neutral-800 px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              disabled={!adding.trim()}
              onClick={() => { onAdd(adding.trim()); setAdding(''); setOpen(false); }}
              className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs font-bold text-neutral-900 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
