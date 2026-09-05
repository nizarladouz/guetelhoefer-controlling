import { serverClient } from '@/lib/supabase/server';
import ZeitraumAuswertung from '@/components/ZeitraumAuswertung';

export const dynamic = 'force-dynamic';

export default async function AuswertungSeite() {
  const { data: statistik } = await serverClient()
    .from('statistik').select('*').order('jahr').order('kw');

  return (
    <main className="wrap">
      <h1>Auswertung</h1>
      <ZeitraumAuswertung statistik={statistik || []} />
    </main>
  );
}
