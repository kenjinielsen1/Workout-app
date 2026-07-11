import { AuthProvider, useAuth } from './auth/AuthProvider';
import { StoreProvider } from './data/StoreProvider';
import { SignIn } from './screens/SignIn';
import { Home } from './screens/Home';

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="grid min-h-full place-items-center text-neutral-400">Loading…</div>;
  }
  if (!user) return <SignIn />;
  return (
    <StoreProvider>
      <Home />
    </StoreProvider>
  );
}

export function App() {
  return (
    <main className="min-h-full bg-white dark:bg-neutral-950">
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </main>
  );
}
