'use client';
import { FILIALEN } from '@/lib/filialen';
import {
  summiere, okQuote, oeffnungsrate, zeigeQuote, farbe, STICHPROBE_MINDEST,
} from '@/lib/berechnung';

export default function FilialTabelle({ statistik }) {
  if (!statistik.length) {
    return <div className="leer">Noch keine Daten importiert.</div>;
  }

  const zeilen = [...statistik].sort((a, b) => a.filiale - b.filiale);
  const gesamt = summiere(zeilen);
  const schnitt = okQuote(gesamt);

  const duenn = zeilen.filter((z) => z.erreicht > 0 && z.erreicht < STICHPROBE_MINDEST);
  const ohneReichweite = zeilen.filter((z) => z.erreicht === 0);

  return (
    <>
      <div className="tabelle-scroll">
        <table>
          <thead>
            <tr>
              <th>Filiale</th>
              <th className="z">Gesendet</th>
              <th className="z">Erreicht</th>
              <th className="z">Öffnungsrate</th>
              <th className="z">„Alles OK!“</th>
              <th className="z">„Alles OK!“-Quote</th>
              <th className="z gruppe">Individual</th>
              <th className="z">Dankeschön</th>
              <th className="z">Rückfrage</th>
              <th className="z">Problematisch</th>
              <th className="z">Offen</th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((z) => {
              const q = okQuote(z);
              return (
                <tr key={z.filiale}>
                  <td>
                    <span className="punkt" style={{ background: farbe(q, schnitt) }} />
                    <b>{z.filiale} · {FILIALEN[z.filiale]}</b>
                  </td>
                  <td className="z">{z.gesendet}</td>
                  <td className="z">{z.erreicht}</td>
                  <td className="z">{zeigeQuote(oeffnungsrate(z))}</td>
                  <td className="z" style={{ color: 'var(--gruen)', fontWeight: 700 }}>{z.ok}</td>
                  <td className="z"><span className="pill" style={{ color: farbe(q, schnitt) }}>{zeigeQuote(q)}</span></td>
                  <td className="z gruppe" style={{ fontWeight: 700 }}>{z.individual || '–'}</td>
                  <td className="z" style={{ color: 'var(--gruen)' }}>{z.danke || '–'}</td>
                  <td className="z" style={{ color: 'var(--info)' }}>{z.rueckfrage || '–'}</td>
                  <td className="z" style={{ color: 'var(--neg)' }}>{z.negativ || '–'}</td>
                  <td className="z" style={{ color: 'var(--warn)', fontWeight: 700 }}>{z.offen || '–'}</td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '2px solid var(--linie)' }}>
              <td><b>Gesamt</b></td>
              <td className="z"><b>{gesamt.gesendet}</b></td>
              <td className="z"><b>{gesamt.erreicht}</b></td>
              <td className="z">{zeigeQuote(oeffnungsrate(gesamt))}</td>
              <td className="z" style={{ color: 'var(--gruen)', fontWeight: 700 }}>{gesamt.ok}</td>
              <td className="z"><span className="pill" style={{ color: 'var(--gruen)' }}>{zeigeQuote(schnitt)}</span></td>
              <td className="z gruppe"><b>{gesamt.individual || '–'}</b></td>
              <td className="z">{gesamt.danke || '–'}</td>
              <td className="z">{gesamt.rueckfrage || '–'}</td>
              <td className="z">{gesamt.negativ || '–'}</td>
              <td className="z">{gesamt.offen || '–'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {ohneReichweite.length > 0 && (
        <div className="hinweis">
          <b>Keine Quote berechenbar:</b>{' '}
          {ohneReichweite.map((z) => FILIALEN[z.filiale]).join(', ')} – niemand hat die Nachricht
          geöffnet oder beantwortet.
        </div>
      )}
      {duenn.length > 0 && (
        <div className="hinweis neutral">
          <b>Kleine Stichprobe:</b> {duenn.map((z) => FILIALEN[z.filiale]).join(', ')} liegen unter{' '}
          {STICHPROBE_MINDEST} erreichten Kunden. Die Quote schwankt dort stark und eignet sich noch
          nicht für den Filialvergleich.
        </div>
      )}
      {gesamt.offen > 0 && (
        <div className="hinweis">
          <b>{gesamt.offen} Individual-Antworten offen:</b> Die „Alles OK!“-Quote steht davon
          unabhängig fest. Die Einstufung ergänzt nur das qualitative Bild.
        </div>
      )}
    </>
  );
}
