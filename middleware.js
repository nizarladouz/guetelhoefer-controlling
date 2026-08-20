import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Erneuert die Session bei jedem Aufruf und schützt alle Seiten außer
 * dem Login. Ohne diesen Schutz wären die Kundendaten für jeden mit
 * der URL erreichbar.
 */
export async function middleware(request) {
  let antwort = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(liste) {
          liste.forEach(({ name, value }) => request.cookies.set(name, value));
          antwort = NextResponse.next({ request });
          liste.forEach(({ name, value, options }) => antwort.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pfad = request.nextUrl.pathname;

  if (!user && !pfad.startsWith('/login') && !pfad.startsWith('/auth')) {
    const ziel = request.nextUrl.clone();
    ziel.pathname = '/login';
    return NextResponse.redirect(ziel);
  }
  return antwort;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
