'use client';
import { useMemo, useState } from 'react';
import { FILIALEN, WERTUNGEN } from '@/lib/filialen';
import {
  okQuote, oeffnungsrate, zeigeQuote, farbe, summiere, STICHPROBE_MINDEST,
} from '@/lib/berechnung';
import {
  verfuegbareWochen, vorlageAnwenden, imZeitraum, aggregiereProFiliale,
  wochenSchluessel, wochenLabel, VORLAGEN,
} from '@/lib/zeitraum';
import { ladeScreenshots } from '@/lib/bilder';
import { erzeugePdf } from '@/lib/pdf';

export default function ZeitraumAuswertung({ statistik, faelle }) {
  const wochen = useMemo(() => verfuegbareWochen(statistik), [statistik]);
  const start = useMemo(() => vorlageAnwenden(wochen, 4), [wochen]);

  const [von, setVon] = useState(start.von);
  const [bis, setBis] = useState(start.bis);
  const [vorlage, setVorlage] = useState('letzte4');
  // Standardmäßig alle Filialen ausgewählt, die überhaupt Daten haben.
  const [gewaehlt, setGewaehlt] = useState(() =>
    [...new Set(statistik.map((s) => s.filiale))].sort((a, b) => a - b));
  const [mitScreenshots, setMitScreenshots] = useState(true);
  const [pdfStatus, setPdfStatus] = useState(null);

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

  const vorhandeneFilialen = [...new Set(statistik.map((s) => s.filiale))].sort((a, b) => a - b);

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

  function filialeUmschalten(id) {
    setGewaehlt((alt) => (alt.includes(id) ? alt.filter((x) => x !== id) : [...alt, id].sort((a, b) => a - b)));
  }

  const imBereich = imZeitraum(statistik, von, bis);
  const proFiliale = aggregiereProFiliale(imBereich).filter((f) => gewaehlt.includes(f.filiale));
  const gesamt = summiere(proFiliale);
  const schnitt = okQuote(gesamt);

  const anzahlWochen = new Set(imBereich.map((z) => wochenSchluessel(z.jahr, z.kw))).size;
  const zeitraumText = von === bis
    ? wochenLabel(...von.split('-').map(Number))
    : `${wochenLabel(...von.split('-').map(Number))} – ${wochenLabel(...bis.split('-').map(Number))}`;

  // Rückmeldungen im Zeitraum und in den gewählten Filialen
  const faelleImBereich = faelle.filter((f) => {
    const k = wochenSchluessel(f.jahr, f.kw);
    return k >= von && k <= bis && gewaehlt.includes(f.filiale);
  }).sort((a, b) => wochenSchluessel(a.jahr, a.kw).localeCompare(wochenSchluessel(b.jahr, b.kw)));

  const mitBild = faelleImBereich.filter((f) => f.screenshot).length;

  async function pdfErzeugen() {
    try {
      let angereichert = faelleImBereich;
      if (mitScreenshots && mitBild) {
        setPdfStatus(`Screenshots werden geladen (${mitBild}) …`);
        angereichert = await ladeScreenshots(faelleImBereich);
      }

      setPdfStatus('PDF wird erzeugt …');
      await erzeugePdf({
        zeitraumText,
        anzahlWochen,
        mitScreenshots,
        filialen: proFiliale.map((f) => ({
          ...f,
          name: FILIALEN[f.filiale],
          faelle: angereichert.filter((x) => x.filiale === f.filiale),
        })),
        gesamt,
      });
    } catch (e) {
      alert('Das PDF konnte nicht erzeugt werden. Bitte erneut versuchen.');
      console.error(e);
    }
    setPdfStatus(null);
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
        </div>
      </section>

      <section className="karte">
        <h2 className="abstand">Filialen für den Bericht
          <small>Anklicken zum Aus- und Abwählen. Nur ausgewählte Filialen erscheinen in der
            Auswertung und im PDF.</small>
        </h2>

        <div className="filter-zeile">
          {vorhandeneFilialen.map((id) => (
            <button key={id} className={`filter ${gewaehlt.includes(id) ? 'an' : ''}`}
                    onClick={() => filialeUmschalten(id)}>
              {gewaehlt.includes(id) ? '✓ ' : ''}{FILIALEN[id]}
            </button>
          ))}
          <button className="filter leise" onClick={() => setGewaehlt(vorhandeneFilialen)}>
            Alle
          </button>
          <button className="filter leise" onClick={() => setGewaehlt([])}>
            Keine
          </button>
        </div>

        <div className="zeile" style={{ justifyContent: 'space-between', marginTop: 18 }}>
          <label className="schalter">
            <input type="checkbox" checked={mitScreenshots}
                   onChange={(e) => setMitScreenshots(e.target.checked)} />
            <span>
              <b>Screenshots der Rückmeldungen einbinden</b>
              {mitBild > 0
                ? ` · ${mitBild} von ${faelleImBereich.length} Rückmeldungen haben einen Screenshot`
                : ' · im gewählten Zeitraum sind keine Screenshots hinterlegt'}
            </span>
          </label>
          <button className="btn" onClick={pdfErzeugen} disabled={pdfStatus !== null || !proFiliale.length}>
            {pdfStatus || 'Als PDF exportieren'}
          </button>
        </div>

        <div className="zeitraum-info">
          Ausgewertet: <b>{zeitraumText}</b> · {anzahlWochen} {anzahlWochen === 1 ? 'Woche' : 'Wochen'}
          {' · '}<b>{gewaehlt.length}</b> {gewaehlt.length === 1 ? 'Filiale' : 'Filialen'}
          {' · '}{gesamt.gesendet} Nachrichten · {faelleImBereich.length} Rückmeldungen
        </div>
      </section>

      {!proFiliale.length ? (
        <section className="karte">
          <div className="leer">Keine Filiale ausgewählt. Wähle oben mindestens eine aus.</div>
        </section>
      ) : (
        <>
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
                  {proFiliale.map((f) => {
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
                  {proFiliale.length > 1 && (
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

            {proFiliale.some((f) => f.erreicht > 0 && f.erreicht < STICHPROBE_MINDEST) && (
              <div className="hinweis neutral">
                <b>Kleine Stichprobe:</b>{' '}
                {proFiliale.filter((f) => f.erreicht > 0 && f.erreicht < STICHPROBE_MINDEST)
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

          <section className="karte">
            <h2 className="abstand">Rückmeldungen im Zeitraum
              <small>Diese Kunden haben selbst geschrieben. Genau diese Liste erscheint auch im PDF.</small>
            </h2>
            {!faelleImBereich.length ? (
              <div className="leer">
                Keine Individual-Antworten im gewählten Zeitraum und in den gewählten Filialen.
              </div>
            ) : (
              <div className="tabelle-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Kunde</th>
                      <th>Filiale</th>
                      <th>Woche</th>
                      <th>Einstufung</th>
                      <th className="z">Screenshot</th>
                      <th>Notiz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faelleImBereich.map((f) => (
                      <tr key={f.id}>
                        <td><b>{f.name}</b></td>
                        <td>{FILIALEN[f.filiale]}</td>
                        <td>{wochenLabel(f.jahr, f.kw)}</td>
                        <td>
                          <span className={`fall-status ${f.wertung ? `st-${f.wertung}` : 'st-offen'}`}>
                            {f.wertung ? WERTUNGEN[f.wertung].text : 'Noch zu prüfen'}
                          </span>
                        </td>
                        <td className="z">{f.screenshot ? '✓' : '–'}</td>
                        <td style={{ color: 'var(--text-leise)', maxWidth: 320 }}>{f.notiz || '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
