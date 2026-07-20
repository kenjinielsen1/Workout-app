// Watches the sync backlog and reports when it's been genuinely stuck (POLISH.md
// §4). Polls the local queue depth (cheap, IndexedDB count) plus checks on
// return-to-foreground / reconnect. Only meaningful in Supabase mode.

import { useEffect, useState } from 'react';
import type { LocalFirstStore } from '../data/localStore';
import { formatSyncSince, isSyncStale, markSyncOk, readLastSyncOk } from '../lib/syncStatus';

export interface SyncStatus {
  /** The backlog has been stuck past the threshold — surface a calm notice. */
  stale: boolean;
  /** Human anchor, e.g. "since Tuesday" (null unless stale). */
  since: string | null;
}

export function useSyncStatus(store: LocalFirstStore, userId: string): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({ stale: false, since: null });

  useEffect(() => {
    if (!store.syncConfigured) return;
    let active = true;

    const check = async () => {
      const pending = await store.pendingSyncCount();
      const now = Date.now();
      if (pending === 0) markSyncOk(userId, now); // last time the queue was clean
      const lastOk = readLastSyncOk(userId);
      const stale = isSyncStale(pending, lastOk, now);
      if (active) setStatus({ stale, since: stale && lastOk ? formatSyncSince(lastOk, now) : null });
    };

    void check();
    const id = window.setInterval(check, 60_000);
    const onWake = () => void check();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [store, userId]);

  return status;
}
