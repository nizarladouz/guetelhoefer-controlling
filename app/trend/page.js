import { serverClient } from '@/lib/supabase/server';
import TrendAnsicht from '@/components/TrendAnsicht';

export const dynamic = 'force-dynamic';

export default async function TrendSeite() {
  const { data: statistik } = await serverClient()
    .from('statistik').select('*').order('jahr').order('kw');

  return (
    <main className="wrap">
      <h1>Trend</h1>
      <section className="karte">
        <h2 className="abstand">„Alles OK!“-Quote im Wochenverlauf
          <small>Je Filiale über alle erfassten Wochen. Erst ab etwa vier Wochen wird ein Verlauf aussagekräftig.</small>
        </h2>
        <TrendAnsicht statistik={statistik || []} />
      </section>
    </main>
  );
}
