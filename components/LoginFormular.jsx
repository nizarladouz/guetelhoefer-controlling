'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase/client';

export default function LoginFormular() {
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const router = useRouter();

  async function anmelden(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler('');
    const { error } = await browserClient().auth.signInWithPassword({ email, password: passwort });
    if (error) {
      // Bewusst unspezifisch: verrät nicht, ob die Adresse existiert.
      setFehler('E-Mail oder Passwort stimmen nicht.');
      setLaeuft(false);
      return;
    }
    router.push('/wochen');
    router.refresh();
  }

  return (
    <div className="login-mitte">
      <form className="login-box" onSubmit={anmelden}>
        <div className="marke" style={{ marginBottom: 4 }}>Gütelhöfer <span>· Filial-Controlling</span></div>
        <div className="unter" style={{ marginBottom: 24 }}>Anmeldung erforderlich</div>

        <input type="email" placeholder="E-Mail" value={email} required
               onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <input type="password" placeholder="Passwort" value={passwort} required
               onChange={(e) => setPasswort(e.target.value)} autoComplete="current-password" />

        {fehler && <div className="hinweis rot" style={{ marginBottom: 12 }}>{fehler}</div>}

        <button className="btn" type="submit" disabled={laeuft}>
          {laeuft ? 'Wird geprüft …' : 'Anmelden'}
        </button>
      </form>
    </div>
  );
}
