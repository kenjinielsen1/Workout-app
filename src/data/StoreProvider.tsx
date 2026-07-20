import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { LocalFirstStore } from './localStore';
import { SupabaseRemoteSync } from './remoteSync';
import { SupabaseRemoteSource } from './remoteSource';
import { markSyncOk } from '../lib/syncStatus';

// The app always talks to the local-first (IndexedDB) store — reads and the
// recommendation path never touch the network. In Supabase mode a RemoteSync is
// attached so the background queue can reconcile when a connection exists.
const StoreContext = createContext<LocalFirstStore | null>(null);

export function useStore(): LocalFirstStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used within <StoreProvider>');
  return store;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { mode, user } = useAuth();
  const store = useMemo(() => {
    if (mode === 'supabase') {
      const client = getSupabase()!;
      // Separate IndexedDB from demo mode — the server owns the catalog (UUID ids),
      // and demo's slug-id catalog must never contaminate real synced data.
      return new LocalFirstStore({
        dbName: 'po-supabase',
        remote: new SupabaseRemoteSync(client),
        source: new SupabaseRemoteSource(client),
      });
    }
    return new LocalFirstStore({ dbName: 'po-demo', seedDemo: true });
  }, [mode]);

  // Reconcile with the server: push local pending first, then pull the server's
  // truth down (order matters — never clobber an un-pushed local write). Both are
  // best-effort and off the live path; failures just leave the queue for later.
  useEffect(() => {
    const reconcile = async () => {
      await store.flush();
      if (user) await store.hydrate(user.id).catch(() => {});
      // Stamp a clean sync so the "not synced" indicator can anchor "since ...".
      if (user && store.syncConfigured && (await store.pendingSyncCount()) === 0) {
        markSyncOk(user.id);
      }
    };
    void reconcile();
    const onOnline = () => void reconcile();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [store, user]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
