'use client';
import { useState } from 'react';
import { browserClient } from '@/lib/supabase/client';
import { FILIALEN, WERTUNGEN } from '@/lib/filialen';
import Screenshot from './Screenshot';

export default function FallListe({ faelle, darfSchreiben, onAenderung }) {
  const [filter, setFilter] = useState('alle');
  const [offen, setOffen] = useState({});
  const [stand, setStand] = useState(() =>
    Object.fromEntries(faelle.map((f) => [f.id, { wertung: f.wertung, notiz: f.notiz }])));
  const [speichert, setSpeichert] = useState(null);

  if (!faelle.length) {
    return (
      <div className="leer">
        Keine Individual-Antworten – entweder noch nichts importiert, oder alle Rückmeldungen kamen
        über „Alles OK!“.
      </div>
    );
  }

  /** Eine Bewertung je Sendung: upsert über den unique-Index auf sendung_id. */
  async function speichere(id, teil) {
    setStand((s) => ({ ...s, [id]: { ...s[id], ...teil } }));
    setSpeichert(id);
    const supabase = browserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const aktuell = { ...stand[id], ...teil };
    await supabase.from('bewertung').upsert(
      {
        sendung_id: id,
        wertung: aktuell.wertung,
        notiz: aktuell.notiz || '',
        bearbeiter_id: user?.id,
        bearbeitet_am: new Date().toISOString(),
      },
      { onConflict: 'sendung_id' }
    );
    setSpeichert(null);
    onAenderung?.();
  }

  const zaehle = (w) => faelle.filter((f) => (w === 'offen' ? !stand[f.id]?.wertung : stand[f.id]?.wertung === w)).length;
  const gruppen = [
    ['alle', 'Alle', faelle.length],
    ['offen', 'Offen', zaehle('offen')],
    ...Object.entries(WERTUNGEN).map(([w, d]) => [w, d.text, zaehle(w)]),
  ];

  const sichtbar = faelle.filter((f) => {
    const w = stand[f.id]?.wertung;
    if (filter === 'alle') return true;
    if (filter === 'offen') return !w;
    return w === filter;
  });

  return (
    <>
      <div className="filter-zeile">
        {gruppen.map(([w, text, n]) => (
          <button key={w} className={`filter ${filter === w ? 'an' : ''}`} onClick={() => setFilter(w)}>
            {text} · {n}
          </button>
        ))}
      </div>

      {!sichtbar.length && <div className="leer">Keine Einträge in dieser Auswahl.</div>}

      {sichtbar.map((f) => {
        const s = stand[f.id] || {};
        return (
          <div key={f.id} className="fall" data-w={s.wertung || ''}>
            <div className="fall-kopf" onClick={() => setOffen((o) => ({ ...o, [f.id]: !o[f.id] }))}>
              <div>
                <div className="fall-name">{f.name}</div>
                <div className="fall-meta">
                  {FILIALEN[f.filiale]} · Rg. {f.rechnung}{f.telefon && ` · ${f.telefon}`}
                </div>
              </div>
              <div className="zeile">
                {f.telefon && <NummerKopieren nummer={f.telefon} />}
                <span className={`fall-status ${s.wertung ? `st-${s.wertung}` : 'st-offen'}`}>
                  {s.wertung ? WERTUNGEN[s.wertung].text : 'Noch zu prüfen'}
                </span>
              </div>
            </div>

            {offen[f.id] && (
              <div className="fall-body">
                <div className="fall-raster">
                  <Screenshot sendungId={f.id} pfad={f.screenshot} darfSchreiben={darfSchreiben}
                              onAenderung={onAenderung} />
                  <div>
                    <div className="wertung-knoepfe">
                      {Object.entries(WERTUNGEN).map(([w, d]) => (
                        <button key={w} className={`wknopf ${s.wertung === w ? `an-${w}` : ''}`}
                                disabled={!darfSchreiben}
                                onClick={() => speichere(f.id, { wertung: s.wertung === w ? null : w })}>
                          <b>{d.text}</b><span>{d.beschreibung}</span>
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="Notiz, z. B. Wartezeit bemängelt oder Rückruf zugesagt"
                      value={s.notiz || ''}
                      disabled={!darfSchreiben}
                      onChange={(e) => setStand((st) => ({ ...st, [f.id]: { ...st[f.id], notiz: e.target.value } }))}
                      onBlur={(e) => darfSchreiben && speichere(f.id, { notiz: e.target.value })}
                    />
                    {speichert === f.id && (
                      <div style={{ fontSize: 12, color: 'var(--text-leise)', marginTop: 6 }}>Wird gespeichert …</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function NummerKopieren({ nummer }) {
  const [text, setText] = useState('Nummer kopieren');
  return (
    <button className="kopier" onClick={async (e) => {
      e.stopPropagation();
      try { await navigator.clipboard.writeText(nummer); setText('Kopiert'); }
      catch { setText(nummer); }
      setTimeout(() => setText('Nummer kopieren'), 1600);
    }}>{text}</button>
  );
}
