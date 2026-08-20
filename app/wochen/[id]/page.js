import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverClient, holeProfil } from '@/lib/supabase/server';
import { DARF_SCHREIBEN } from '@/lib/filialen';
import WochenDashboard from '@/components/WochenDashboard';

export const dynamic = 'force-dynamic';

export default async function WochenSeite({ params }) {
  const profil = await holeProfil();
  const supabase = serverClient();

  const { data: woche } = await supabase.from('woche').select('*').eq('id', params.id).single();
  if (!woche) notFound();

  const { data: statistik } = await supabase.from('statistik').select('*').eq('woche_id', params.id);

  // Nur die Individual-Antworten laden - das ist die Arbeitsliste.
  const { data: faelle } = await supabase
    .from('sendung')
    .select('id, kontakt:kontakt_id (name, telefon, rechnung, filiale), bewertung (*)')
    .eq('woche_id', params.id)
    .eq('individual', true);

  return (
    <main className="wrap">
      <div className="zeile" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>KW {woche.kw} · {woche.jahr}</h1>
          <div className="unter">{woche.abgeschlossen ? 'Abgeschlossen' : 'In Bearbeitung'}</div>
        </div>
        <Link href="/wochen" className="btn leise">Zurück zur Übersicht</Link>
      </div>

      <WochenDashboard
        woche={woche}
        statistik={statistik || []}
        faelle={(faelle || []).map((f) => ({
          id: f.id,
          name: f.kontakt?.name || 'Ohne Namen',
          telefon: f.kontakt?.telefon || '',
          rechnung: f.kontakt?.rechnung || '',
          filiale: f.kontakt?.filiale,
          wertung: f.bewertung?.wertung || null,
          notiz: f.bewertung?.notiz || '',
          screenshot: f.bewertung?.screenshot || null,
        }))}
        darfSchreiben={DARF_SCHREIBEN.includes(profil.rolle)}
      />
    </main>
  );
}
