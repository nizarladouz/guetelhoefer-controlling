'use client';
import { useMemo, useState } from 'react';
import { FILIALEN } from '@/lib/filialen';
import {
  okQuote, oeffnungsrate, zeigeQuote, farbe, summiere, STICHPROBE_MINDEST,
} from '@/lib/berechnung';
import {
  verfuegbareWochen, vorlageAnwenden, imZeitraum, aggregiereProFiliale,
  verlaufFuerFiliale, wochenSchluessel, wochenLabel, VORLAGEN,
} from '@/lib/zeitraum';
import { erzeugePdf } from '@/lib/pdf';

export default function ZeitraumAuswertung({ statistik }) {
  const wochen = useMemo(() => verfuegbareWochen(statistik), [statistik]);
  const start = useMemo(() => vorlageAnwenden(wochen, 4), [wochen]);

  const [von, setVon] = useState(start.von);
  const [bis, setBis] = useState(start.bis);
  const [vorlage, setVorlage] = useState('letzte4');
  const [nurFiliale, setNurFiliale] = useState('alle');
  const [pdfLaeuft, setPdfLaeuft] = useState(false);

  if (!wochen.length) {
    return (
      <section className="karte">
        <div className="leer">
          Noch keine Wochen erfasst. Sobald die erste Woche importiert ist, kannst du hier
          Zeiträume auswerten.
        </div>
      </section>
    );
  }

  function vorlageWaehlen(v) {
    setVorlage(v.id);
    const bereich = vorlageAnwenden(wochen, v.anzahl);
    setVon(bereich.von);
    setBis(bereich.bis);
  }

  // Manuelle Auswahl hebt die Vorlage auf - sonst stimmt die Markierung nicht mehr.
  function grenzeSetzen(welche, wert) {
    setVorlage(null);
    if (welche === 'von') setVon(wert > bis ? bis : wert);
    else setBis(wert < von ? von : wert);
  }

  const imBereich = imZeitraum(statistik, von, bis);
  const proFiliale = aggregiereProFiliale(imBereich);
  const sichtbar = nurFiliale === 'alle'
    ? proFiliale
    : proFiliale.filter((f) => f.filiale === Number(nurFiliale));
  const gesamt = summiere(sichtbar);
  const schnitt = okQuote(gesamt);

  const anzahlWochen = new Set(imBereich.map((z) => wochenSchluessel(z.jahr, z.kw))).size;
  const zeitraumText = von === bis
    ? wochenLabel(...von.split('-').map(Number))
    : `${wochenLabel(...von.split('-').map(Number))} – ${wochenLabel(...bis.split('-').map(Number))}`;

  async function pdfErzeugen() {
    setPdfLaeuft(true);
    try {
      await erzeugePdf({
        zeitraumText,
        anzahlWochen,
        filialen: sichtbar.map((f) => ({
          ...f,
          name: FILIALEN[f.filiale],
          verlauf: verlaufFuerFiliale(imBereich, f.filiale),
        })),
        gesamt,
      });
    } catch (e) {
      alert('Das PDF konnte nicht erzeugt werden. Bitte erneut versuchen.');
      console.error(e);
    }
    setPdfLaeuft(false);
  }

  return (
    <>
      <section className="karte">
        <h2 className="abstand">Zeitraum wählen
          <small>Vorlage anklicken oder Start- und Endwoche einzeln setzen. Die Quoten werden
            aus den Summen des gesamten Zeitraums berechnet, nicht als Mittelwert der Wochen.</small>
        </h2>

        <div className="filter-zeile">
          {VORLAGEN.map((v) => (
            <button key={v.id} className={`filter ${vorlage === v.id ? 'an' : ''}`}
                    onClick={() => vorlageWaehlen(v)}>
              {v.text}
            </button>
          ))}
        </div>

        <div className="zeile" style={{ gap: 14 }}>
          <label className="feld">
            <span>Von</span>
            <select value={von} onChange={(e) => grenzeSetzen('von', e.target.value)}>
              {[...wochen].reverse().map((w) => (
                <option key={w.schluessel} value={w.schluessel}>{wochenLabel(w.jahr, w.kw)}</option>
              ))}
            </select>
          </label>
          <label className="feld">
            <span>Bis</span>
            <select value={bis} onChange={(e) => grenzeSetzen('bis', e.target.value)}>
              {[...wochen].reverse().map((w) => (
                <option key={w.schluessel} value={w.schluessel}>{wochenLabel(w.jahr, w.kw)}</option>
              ))}
            </select>
          </label>
          <label className="feld">
            <span>Filiale</span>
            <select value={nurFiliale} onChange={(e) => setNurFiliale(e.target.value)}>
              <option value="alle">Alle Filialen</option>
              {Object.entries(FILIALEN).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={pdfErzeugen} disabled={pdfLaeuft || !sichtbar.length}
                  style={{ alignSelf: 'flex-end' }}>
            {pdfLaeuft ? 'PDF wird erzeugt …' : 'Als PDF exportieren'}
          </button>
        </div>

        <div className="zeitraum-info">
          Ausgewertet: <b>{zeitraumText}</b> · {anzahlWochen} {anzahlWochen === 1 ? 'Woche' : 'Wochen'}
          {' · '}{gesamt.gesendet} Nachrichten
        </div>
      </section>

      <section className="kpis">
        <div className="kpi leit">
          <div className="label">„Alles OK!“-Quote im Zeitraum</div>
          <div className="zahl">{zeigeQuote(schnitt)}</div>
          <div className="zusatz">{gesamt.ok} von {gesamt.erreicht} erreichten Kunden</div>
        </div>
        <div className="kpi">
          <div className="label">Gesendet</div>
          <div className="zahl">{gesamt.gesendet || '–'}</div>
          <div className="zusatz">über {anzahlWochen} {anzahlWochen === 1 ? 'Woche' : 'Wochen'}</div>
        </div>
        <div className="kpi info">
          <div className="label">Erreicht</div>
          <div className="zahl">{gesamt.erreicht || '–'}</div>
          <div className="zusatz">{zeigeQuote(oeffnungsrate(gesamt))} Öffnungsrate</div>
        </div>
        <div className="kpi">
          <div className="label">Individual-Antworten</div>
          <div className="zahl">{gesamt.individual || '–'}</div>
          <div className="zusatz">{gesamt.negativ} problematisch</div>
        </div>
        <div className="kpi warn">
          <div className="label">Offen zu prüfen</div>
          <div className="zahl">{gesamt.offen || '–'}</div>
          <div className="zusatz">noch nicht eingestuft</div>
        </div>
      </section>

      <section className="karte">
        <h2 className="abstand">Filialvergleich im Zeitraum
          <small>Summen über alle Wochen des gewählten Bereichs</small>
        </h2>
        <div className="tabelle-scroll">
          <table>
            <thead>
              <tr>
                <th>Filiale</th>
                <th className="z">Wochen</th>
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
              {sichtbar.map((f) => {
                const q = okQuote(f);
                return (
                  <tr key={f.filiale}>
                    <td>
                      <span className="punkt" style={{ background: farbe(q, schnitt) }} />
                      <b>{f.filiale} · {FILIALEN[f.filiale]}</b>
                    </td>
                    <td className="z">{f.wochen}</td>
                    <td className="z">{f.gesendet}</td>
                    <td className="z">{f.erreicht}</td>
                    <td className="z">{zeigeQuote(oeffnungsrate(f))}</td>
                    <td className="z" style={{ color: 'var(--gruen)', fontWeight: 700 }}>{f.ok}</td>
                    <td className="z"><span className="pill" style={{ color: farbe(q, schnitt) }}>{zeigeQuote(q)}</span></td>
                    <td className="z gruppe" style={{ fontWeight: 700 }}>{f.individual || '–'}</td>
                    <td className="z" style={{ color: 'var(--gruen)' }}>{f.danke || '–'}</td>
                    <td className="z" style={{ color: 'var(--info)' }}>{f.rueckfrage || '–'}</td>
                    <td className="z" style={{ color: 'var(--neg)' }}>{f.negativ || '–'}</td>
                    <td className="z" style={{ color: 'var(--warn)', fontWeight: 700 }}>{f.offen || '–'}</td>
                  </tr>
                );
              })}
              {sichtbar.length > 1 && (
                <tr style={{ borderTop: '2px solid var(--linie)' }}>
                  <td><b>Gesamt</b></td>
                  <td className="z">{anzahlWochen}</td>
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
              )}
            </tbody>
          </table>
        </div>

        {sichtbar.some((f) => f.erreicht > 0 && f.erreicht < STICHPROBE_MINDEST) && (
          <div className="hinweis neutral">
            <b>Kleine Stichprobe:</b>{' '}
            {sichtbar.filter((f) => f.erreicht > 0 && f.erreicht < STICHPROBE_MINDEST)
              .map((f) => FILIALEN[f.filiale]).join(', ')}{' '}
            liegen auch über den gesamten Zeitraum unter {STICHPROBE_MINDEST} erreichten Kunden.
          </div>
        )}
        {gesamt.offen > 0 && (
          <div className="hinweis">
            <b>{gesamt.offen} Individual-Antworten offen:</b> Die „Alles OK!“-Quote steht davon
            unabhängig fest, das qualitative Bild ist aber noch unvollständig.
          </div>
        )}
      </section>
    </>
  );
}
