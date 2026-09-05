'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase/client';

/**
 * Zwei getrennte Aktionen, weil sie unterschiedlich weit gehen:
 *
 * "Daten zurücksetzen" löscht nur die Sendungen dieser Woche - die Woche
 * bleibt bestehen und kann sofort neu importiert werden. Nötig, wenn eine
 * fehlerhafte CSV geladen wurde oder Kontakte aus dem Export verschwunden
 * sind (ein reiner Neu-Import würde die alten Zeilen sonst stehen lassen).
 *
 * "Woche löschen" entfernt die Woche komplett. Bewertungen und Screenshots
 * dieser Woche gehen dabei mit verloren, die Kontakte selbst bleiben.
 */
export default function WocheVerwalten({ woche, hatDaten, onGeleert }) {
  const [laeuft, setLaeuft] = useState(null);
  const [fehler, setFehler] = useState('');
  const router = useRouter();

  async function zuruecksetzen() {
    if (!confirm(
      `Alle importierten Daten von KW ${woche.kw}/${woche.jahr} löschen?\n\n`
      + 'Die Woche bleibt bestehen und kann direkt neu importiert werden. '
      + 'Bewertungen und Screenshots dieser Woche gehen dabei verloren.'
    )) return;

    setLaeuft('reset');
    setFehler('');
    const { error } = await browserClient().from('sendung').delete().eq('woche_id', woche.id);
    setLaeuft(null);

    if (error) { setFehler('Zurücksetzen fehlgeschlagen: ' + error.message); return; }
    onGeleert?.();
    router.refresh();
  }

  async function loeschen() {
    if (!confirm(
      `KW ${woche.kw}/${woche.jahr} vollständig löschen?\n\n`
      + 'Die Woche verschwindet aus der Übersicht und dem Trend. '
      + 'Die Kontakte selbst bleiben erhalten.'
    )) return;

    setLaeuft('delete');
    setFehler('');
    const { error } = await browserClient().from('woche').delete().eq('id', woche.id);

    if (error) {
      setLaeuft(null);
      setFehler('Löschen fehlgeschlagen: ' + error.message);
      return;
    }
    router.push('/wochen');
    router.refresh();
  }

  return (
    <div className="verwalten">
      <div className="zeile" style={{ justifyContent: 'space-between' }}>
        <div className="verwalten-text">
          <b>Woche verwalten</b>
          <span>
            Ein erneuter CSV-Import überschreibt bestehende Kontakte dieser Woche automatisch.
            Zum vollständigen Neuaufbau vorher zurücksetzen.
          </span>
        </div>
        <div className="zeile">
          {hatDaten && (
            <button className="btn leise" onClick={zuruecksetzen} disabled={laeuft !== null}>
              {laeuft === 'reset' ? 'Wird zurückgesetzt …' : 'Daten zurücksetzen'}
            </button>
          )}
          <button className="btn gefahr" onClick={loeschen} disabled={laeuft !== null}>
            {laeuft === 'delete' ? 'Wird gelöscht …' : 'Woche löschen'}
          </button>
        </div>
      </div>
      {fehler && <div className="hinweis rot">{fehler}</div>}
    </div>
  );
}
