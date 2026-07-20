// Persistent-sync surfacing (POLISH.md §4). Local-first means a backlog is never
// data loss — it's queued on the device. So the indicator is calm and factual, and
// only appears once sync has genuinely been stuck for a while (not the moment you
// walk out of wifi mid-set). Pure logic here; the hook wires polling + storage.

export const SYNC_STALE_MS = 24 * 60 * 60 * 1000; // a day of no successful sync

/** Show the "not synced" notice only when there's a real backlog AND it's been
 *  stuck past the threshold. A fresh device that never synced (lastOkAt null) is
 *  not "stale" — it just hasn't started. */
export function isSyncStale(pending: number, lastOkAt: number | null, now: number): boolean {
  if (pending <= 0) return false;
  if (lastOkAt === null) return false;
  return now - lastOkAt >= SYNC_STALE_MS;
}

/** "since Tuesday" within the last week, else "since Mar 3" — the human anchor
 *  from the DESIGN.md example. */
export function formatSyncSince(lastOkAt: number, now: number): string {
  const days = Math.floor((now - lastOkAt) / (24 * 60 * 60 * 1000));
  const d = new Date(lastOkAt);
  if (days < 7) return `since ${d.toLocaleDateString(undefined, { weekday: 'long' })}`;
  return `since ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

// Last time the queue was known fully drained, per user (localStorage — device
// local, like the timers). The provider stamps it after a clean reconcile; the
// indicator hook reads it to anchor "since ...".
const okKey = (userId: string) => `po:syncOk:${userId}`;

export function readLastSyncOk(userId: string): number | null {
  try {
    const raw = localStorage.getItem(okKey(userId));
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function markSyncOk(userId: string, at: number = Date.now()): void {
  try {
    localStorage.setItem(okKey(userId), String(at));
  } catch {
    /* private mode — the indicator just won't anchor a date */
  }
}
