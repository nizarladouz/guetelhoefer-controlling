import { serverClient } from '@/lib/supabase/server';
import ZeitraumAuswertung from '@/components/ZeitraumAuswertung';

export const dynamic = 'force-dynamic';

export default async function AuswertungSeite() {
  const supabase = serverClient();

  const { data: statistik } = await supabase
    .from('statistik').select('*').order('jahr').order('kw');

  // Alle Individual-Antworten mit Woche, Kontakt und Bewertung - Grundlage
  // für den Rückmeldungs-Teil im PDF. Gefiltert wird erst im Client,
  // damit ein Wechsel von Zeitraum oder Filiale keine neue Abfrage braucht.
  const { data: faelle } = await supabase
    .from('sendung')
    .select('id, woche:woche_id (kw, jahr), kontakt:kontakt_id (name, rechnung, filiale), bewertung (wertung, notiz, screenshot)')
    .eq('individual', true);

  return (
    <main className="wrap">
      <h1>Auswertung</h1>
      <ZeitraumAuswertung
        statistik={statistik || []}
        faelle={(faelle || []).map((f) => ({
          id: f.id,
          kw: f.woche?.kw,
          jahr: f.woche?.jahr,
          filiale: f.kontakt?.filiale,
          name: f.kontakt?.name || 'Ohne Namen',
          rechnung: f.kontakt?.rechnung || '',
          wertung: f.bewertung?.wertung || null,
          notiz: f.bewertung?.notiz || '',
          screenshot: f.bewertung?.screenshot || null,
        })).filter((f) => f.filiale && f.kw)}
      />
    </main>
  );
}
