import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';

export function SignIn() {
  const { mode, signIn, signUp, continueAsDemo } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    if (error) setError(error);
    setBusy(false);
  };

  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 px-6 py-10 text-neutral-900 dark:text-neutral-50">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Progressive Overload</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {isSignUp ? 'Create your account' : 'Sign in to keep training'}
        </p>
      </div>

      {mode === 'demo' && (
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          No backend configured — running in demo mode. Data lives only in this browser tab.
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={mode === 'demo'}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-3 text-base outline-none focus:border-emerald-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={mode === 'demo'}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-3 text-base outline-none focus:border-emerald-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {mode === 'supabase' ? (
          <>
            <button
              type="submit"
              disabled={busy}
              className="rounded-2xl bg-emerald-600 py-3 text-base font-bold text-white active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? '…' : isSignUp ? 'Sign up' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp((v) => !v)}
              className="text-sm text-neutral-500 hover:underline dark:text-neutral-400"
            >
              {isSignUp ? 'Have an account? Sign in' : 'New here? Create an account'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={continueAsDemo}
            className="rounded-2xl bg-emerald-600 py-3 text-base font-bold text-white active:scale-[0.99]"
          >
            Continue in demo mode
          </button>
        )}
      </form>
    </div>
  );
}
