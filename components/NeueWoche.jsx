'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase/client';

/** Kalenderwoche nach ISO 8601 - die in Deutschland übliche Zählung. */
function aktuelleKw(datum = new Date()) {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const jahresBeginn = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return {
    kw: Math.ceil(((d - jahresBeginn) / 86400000 + 1) / 7),
    jahr: d.getUTCFullYear(),
  };
}

export default function NeueWoche() {
  const vorgabe = aktuelleKw();
  const [offen, setOffen] = useState(false);
  const [kw, setKw] = useState(vorgabe.kw);
  const [jahr, setJahr] = useState(vorgabe.jahr);
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const router = useRouter();

  async function anlegen() {
    setLaeuft(true);
    setFehler('');
    const { data, error } = await browserClient()
      .from('woche').insert({ kw: Number(kw), jahr: Number(jahr) }).select().single();

    if (error) {
      setFehler(error.code === '23505'
        ? `KW ${kw}/${jahr} gibt es bereits.`
        : 'Anlegen fehlgeschlagen. Prüfe deine Berechtigung.');
      setLaeuft(false);
      return;
    }
    router.push(`/wochen/${data.id}`);
    router.refresh();
  }

  if (!offen) return <button className="btn" onClick={() => setOffen(true)}>Neue Woche anlegen</button>;

  return (
    <div className="zeile">
      <input type="number" min="1" max="53" value={kw} style={{ width: 90 }}
             onChange={(e) => setKw(e.target.value)} aria-label="Kalenderwoche" />
      <input type="number" min="2024" max="2100" value={jahr} style={{ width: 110 }}
             onChange={(e) => setJahr(e.target.value)} aria-label="Jahr" />
      <button className="btn" onClick={anlegen} disabled={laeuft}>
        {laeuft ? 'Wird angelegt …' : 'Anlegen'}
      </button>
      <button className="btn leise" onClick={() => setOffen(false)}>Abbrechen</button>
      {fehler && <span style={{ color: 'var(--neg)', fontSize: 13 }}>{fehler}</span>}
    </div>
  );
}
