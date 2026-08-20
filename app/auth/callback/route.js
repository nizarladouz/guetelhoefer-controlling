import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';

/** Bestätigungslinks aus Einladungsmails landen hier. */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) await serverClient().auth.exchangeCodeForSession(code);
  return NextResponse.redirect(`${origin}/wochen`);
}
