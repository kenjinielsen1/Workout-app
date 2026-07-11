import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  mode: 'supabase' | 'demo';
  signIn(email: string, password: string): Promise<{ error?: string }>;
  signUp(email: string, password: string): Promise<{ error?: string }>;
  continueAsDemo(): void;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode: 'supabase' | 'demo' = isSupabaseConfigured ? 'supabase' : 'demo';
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mode === 'demo') {
      setLoading(false);
      return;
    }
    const sb = getSupabase()!;
    let active = true;
    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session ? { id: data.session.user.id, email: data.session.user.email } : null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session ? { id: session.user.id, email: session.user.email } : null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [mode]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      mode,
      async signIn(email, password) {
        const sb = getSupabase();
        if (!sb) return {};
        const { error } = await sb.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
      },
      async signUp(email, password) {
        const sb = getSupabase();
        if (!sb) return {};
        const { error } = await sb.auth.signUp({ email, password });
        return error ? { error: error.message } : {};
      },
      continueAsDemo() {
        setUser({ id: 'demo-user', email: 'demo@local' });
      },
      async signOut() {
        const sb = getSupabase();
        if (sb) await sb.auth.signOut();
        setUser(null);
      },
    }),
    [user, loading, mode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
