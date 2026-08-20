import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function serverClient() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll(liste) {
          // In Server Components ist Schreiben nicht erlaubt; die Middleware
          // erneuert die Session, deshalb ist der Fehler hier unkritisch.
          try { liste.forEach(({ name, value, options }) => store.set(name, value, options)); }
          catch { /* absichtlich still */ }
        },
      },
    }
  );
}

/** Angemeldeter Nutzer samt Rolle, oder null. */
export async function holeProfil() {
  const supabase = serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profile').select('*').eq('id', user.id).single();
  return data ? { ...data, email: user.email } : null;
}
