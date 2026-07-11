import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The app runs in two modes:
//   • Supabase mode — when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set.
//   • Demo mode     — no env; an in-memory store and a local fake user.
// This keeps `npm run dev` working with zero configuration while the real backend
// is a matter of dropping a .env in place.

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anon!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
