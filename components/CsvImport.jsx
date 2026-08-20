'use client';
import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { browserClient } from '@/lib/supabase/client';
import { bereiteImportVor } from '@/lib/csv';

/**
 * Import der Superchat-Exporte in eine Woche.
 * Kontakte werden über superchat_id zusammengeführt, damit derselbe Kunde
 * über die Wochen hinweg eine Identität behält.
 */
export default function CsvImport({ wocheId, onFertig }) {
  const [meldungen, setMeldungen] = useState([]);
  const [laeuft, setLaeuft] = useState(false);
  const eingabe = useRef(null);

  const melde = (art, text) => setMeldungen((m) => [...m, { art, text }]);

  async function importiere(datei) {
    setLaeuft(true);
    const zeilen = await new Promise((fertig) => {
      Papa.parse(datei, { header: true, skipEmptyLines: 'greedy', complete: (e) => fertig(e.data) });
    });

    const { datensaetze, ohneFiliale, doppelt, fehlend } = bereiteImportVor(zeilen, datei.name);
    if (fehlend.length) melde('rot', `${datei.name}: Spalte ${fehlend.join(' und ')} nicht gefunden.`);
    if (!datensaetze.length) { melde('rot', `${datei.name}: keine zuordenbaren Zeilen.`); setLaeuft(false); return; }

    const supabase = browserClient();

    // 1. Kontakte anlegen oder aktualisieren
    const { data: kontakte, error: kFehler } = await supabase
      .from('kontakt')
      .upsert(datensaetze.map((d) => d.kontakt), { onConflict: 'superchat_id' })
      .select('id, superchat_id');

    if (kFehler) { melde('rot', `Kontakte konnten nicht gespeichert werden: ${kFehler.message}`); setLaeuft(false); return; }

    const nachId = Object.fromEntries(kontakte.map((k) => [k.superchat_id, k.id]));

    // 2. Sendungen für diese Woche schreiben. Ein erneuter Import derselben
    //    Datei überschreibt die Werte, statt Dubletten anzulegen.
    const sendungen = datensaetze
      .map((d) => ({ woche_id: wocheId, kontakt_id: nachId[d.kontakt.superchat_id], ...d.sendung }))
      .filter((s) => s.kontakt_id);

    const { error: sFehler } = await supabase
      .from('sendung').upsert(sendungen, { onConflict: 'woche_id,kontakt_id' });

    if (sFehler) { melde('rot', `Sendungen konnten nicht gespeichert werden: ${sFehler.message}`); setLaeuft(false); return; }

    melde('gut', `${datei.name}: ${sendungen.length} Kontakte importiert.`);
    if (ohneFiliale) melde('warn', `${ohneFiliale} Zeilen ohne erkennbare Filiale übersprungen.`);
    if (doppelt) melde('warn', `${doppelt} doppelte Kontakte innerhalb der Datei übersprungen.`);

    setLaeuft(false);
    onFertig?.();
  }

  async function nimm(dateien) {
    setMeldungen([]);
    for (const datei of Array.from(dateien)) {
      await importiere(datei);   // nacheinander, damit die Meldungen lesbar bleiben
    }
  }

  return (
    <>
      <div
        id="drop"
        role="button"
        tabIndex={0}
        onClick={() => eingabe.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); eingabe.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('aktiv'); }}
        onDragLeave={(e) => e.currentTarget.classList.remove('aktiv')}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('aktiv'); nimm(e.dataTransfer.files); }}
      >
        <strong>{laeuft ? 'Import läuft …' : 'CSV-Dateien hierher ziehen'}</strong>
        <p>oder klicken zum Auswählen · Bornheim und „Alle außer Bornheim“ zusammen</p>
      </div>

      <input ref={eingabe} type="file" accept=".csv" multiple hidden
             onChange={(e) => { nimm(e.target.files); e.target.value = ''; }} />

      {meldungen.map((m, i) => (
        <div key={i} className={`hinweis ${m.art === 'rot' ? 'rot' : m.art === 'gut' ? 'neutral' : ''}`}>
          {m.text}
        </div>
      ))}
    </>
  );
}
