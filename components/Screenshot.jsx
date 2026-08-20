'use client';
import { useEffect, useRef, useState } from 'react';
import { browserClient } from '@/lib/supabase/client';

/**
 * Screenshots liegen im privaten Storage-Bucket, nicht in der Datenbank.
 * Angezeigt wird über eine signierte URL mit kurzer Gültigkeit.
 */
export default function Screenshot({ sendungId, pfad, darfSchreiben, onAenderung }) {
  const [aktuellerPfad, setPfad] = useState(pfad);
  const [url, setUrl] = useState(null);
  const [laeuft, setLaeuft] = useState(false);
  const eingabe = useRef(null);

  useEffect(() => {
    let abgebrochen = false;
    if (!aktuellerPfad) { setUrl(null); return; }
    browserClient().storage.from('screenshots').createSignedUrl(aktuellerPfad, 3600)
      .then(({ data }) => { if (!abgebrochen) setUrl(data?.signedUrl || null); });
    return () => { abgebrochen = true; };
  }, [aktuellerPfad]);

  async function hochladen(datei) {
    if (!datei || !darfSchreiben) return;
    setLaeuft(true);
    const supabase = browserClient();
    const endung = datei.name.split('.').pop() || 'png';
    const ziel = `${sendungId}/${Date.now()}.${endung}`;

    const { error } = await supabase.storage.from('screenshots').upload(ziel, datei, { upsert: true });
    if (!error) {
      await supabase.from('bewertung').upsert(
        { sendung_id: sendungId, screenshot: ziel }, { onConflict: 'sendung_id' }
      );
      setPfad(ziel);
      onAenderung?.();
    }
    setLaeuft(false);
  }

  async function entfernen() {
    if (!aktuellerPfad || !darfSchreiben) return;
    const supabase = browserClient();
    await supabase.storage.from('screenshots').remove([aktuellerPfad]);
    await supabase.from('bewertung').upsert(
      { sendung_id: sendungId, screenshot: null }, { onConflict: 'sendung_id' }
    );
    setPfad(null);
    onAenderung?.();
  }

  return (
    <div>
      <div
        className="shot-feld"
        onClick={() => darfSchreiben && eingabe.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); hochladen(e.dataTransfer.files[0]); }}
        style={{ cursor: darfSchreiben ? 'pointer' : 'default' }}
      >
        {laeuft ? <span>Wird hochgeladen …</span>
          : url ? <img src={url} alt="Screenshot der Kundenantwort" />
            : <span>{darfSchreiben ? 'Screenshot hier ablegen oder klicken' : 'Kein Screenshot hinterlegt'}</span>}
      </div>

      <input ref={eingabe} type="file" accept="image/*" hidden
             onChange={(e) => hochladen(e.target.files[0])} />

      {aktuellerPfad && darfSchreiben && (
        <button className="kopier" style={{ marginTop: 8 }} onClick={entfernen}>Screenshot entfernen</button>
      )}
    </div>
  );
}
