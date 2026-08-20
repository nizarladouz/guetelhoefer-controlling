import Link from 'next/link';
import { serverClient, holeProfil } from '@/lib/supabase/server';
import { DARF_SCHREIBEN } from '@/lib/filialen';
import { summiere, okQuote, zeigeQuote, leereZeile } from '@/lib/berechnung';
import NeueWoche from '@/components/NeueWoche';

export const dynamic = 'force-dynamic';

export default async function WochenSeite() {
  const profil = await holeProfil();
  const supabase = serverClient();

  const { data: wochen } = await supabase
    .from('woche').select('*').order('jahr', { ascending: false }).order('kw', { ascending: false });
  const { data: statistik } = await supabase.from('statistik').select('*');

  const proWoche = (id) => {
    const zeilen = (statistik || []).filter((s) => s.woche_id === id);
    return zeilen.length ? summiere(zeilen) : leereZeile();
  };

  return (
    <main className="wrap">
      <div className="zeile" style={{ justifyContent: 'space-between' }}>
        <h1>Wochen</h1>
        {DARF_SCHREIBEN.includes(profil.rolle) && <NeueWoche />}
      </div>

      {!wochen?.length ? (
        <div className="karte">
          <div className="leer">
            Noch keine Woche angelegt.
            {DARF_SCHREIBEN.includes(profil.rolle)
              ? ' Lege oben die erste an und importiere die Kampagnen-Exporte.'
              : ' Sobald eine Auswertung vorliegt, erscheint sie hier.'}
          </div>
        </div>
      ) : (
        <div className="wochen-gitter">
          {wochen.map((w) => {
            const s = proWoche(w.id);
            return (
              <Link key={w.id} href={`/wochen/${w.id}`} className="wochen-karte">
                <div className="kw">KW {w.kw} · {w.jahr}</div>
                <div className="q">{zeigeQuote(okQuote(s))}</div>
                <div className="fuss">
                  {s.ok} von {s.erreicht} erreichten bestätigt
                  {s.offen > 0 && ` · ${s.offen} offen`}
                </div>
                <div className="fuss" style={{ marginTop: 8 }}>
                  {w.abgeschlossen ? 'Abgeschlossen' : 'In Bearbeitung'}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
