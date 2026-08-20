'use client';
import { summiere, okQuote, oeffnungsrate, quote, zeigeQuote } from '@/lib/berechnung';

export default function KpiZeile({ statistik }) {
  const g = summiere(statistik);
  const hatDaten = g.gesendet > 0;

  return (
    <section className="kpis">
      <div className="kpi leit">
        <div className="label">„Alles OK!“-Quote</div>
        <div className="zahl">{hatDaten ? zeigeQuote(okQuote(g)) : '–'}</div>
        <div className="zusatz">
          {hatDaten ? `${g.ok} von ${g.erreicht} erreichten Kunden haben bestätigt`
                    : 'der erreichten Kunden bestätigen'}
        </div>
      </div>
      <div className="kpi">
        <div className="label">Gesendet</div>
        <div className="zahl">{hatDaten ? g.gesendet : '–'}</div>
        <div className="zusatz">Kontakte mit Handynummer</div>
      </div>
      <div className="kpi info">
        <div className="label">Erreicht</div>
        <div className="zahl">{hatDaten ? g.erreicht : '–'}</div>
        <div className="zusatz">
          {hatDaten ? `${zeigeQuote(oeffnungsrate(g))} Öffnungsrate` : 'gelesen oder beantwortet'}
        </div>
      </div>
      <div className="kpi">
        <div className="label">Individual-Antworten</div>
        <div className="zahl">{hatDaten ? g.individual : '–'}</div>
        <div className="zusatz">
          {hatDaten ? `${zeigeQuote(quote(g.individual, g.erreicht))} der erreichten Kunden`
                    : 'selbst geschrieben'}
        </div>
      </div>
      <div className="kpi warn">
        <div className="label">Offen zu prüfen</div>
        <div className="zahl">{hatDaten ? g.offen : '–'}</div>
        <div className="zusatz">noch nicht eingestuft</div>
      </div>
    </section>
  );
}
