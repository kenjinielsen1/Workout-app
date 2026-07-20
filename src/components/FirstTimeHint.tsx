// Progressive onboarding (POLISH.md §6). Each novel control explains itself in one
// line the FIRST time it appears, then never again — no tutorial, no modal wall.
// The "seen" flag is per-hint in localStorage, so the reveal is spread across the
// first few sessions as controls become relevant.

import { useEffect, useState, type ReactNode } from 'react';

const key = (id: string) => `po:hint:${id}`;

function seen(id: string): boolean {
  try {
    return localStorage.getItem(key(id)) === 'seen';
  } catch {
    return true; // storage blocked → don't nag
  }
}

function markSeen(id: string): void {
  try {
    localStorage.setItem(key(id), 'seen');
  } catch {
    /* private mode — worst case the hint shows again next session */
  }
}

/** One-line "here's why this exists", shown once ever for `id`. Marks itself seen
 *  on first render so it can't reappear even if the user never taps "Got it". */
export function FirstTimeHint({ id, children }: { id: string; children: ReactNode }) {
  const [show, setShow] = useState(() => !seen(id));

  useEffect(() => {
    if (show) markSeen(id);
    // Intentionally run once for this hint id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!show) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs leading-snug text-neutral-400">
      <span className="flex-1">{children}</span>
      <button
        type="button"
        onClick={() => setShow(false)}
        className="shrink-0 font-semibold text-neutral-300"
      >
        Got it
      </button>
    </div>
  );
}
