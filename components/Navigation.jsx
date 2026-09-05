'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase/client';

const ROLLEN_TEXT = { admin: 'Admin', bearbeiter: 'Bearbeitung', betrachter: 'Leserecht' };

export default function Navigation({ profil }) {
  const pfad = usePathname();
  const router = useRouter();

  async function abmelden() {
    await browserClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const punkte = [
    { href: '/wochen', text: 'Wochen' },
    { href: '/auswertung', text: 'Auswertung' },
    { href: '/trend', text: 'Trend' },
  ];

  return (
    <header className="kopf">
      <div className="wrap">
        <div>
          <div className="marke">Gütelhöfer <span>· Filial-Controlling</span></div>
          <div className="unter">Kundenzufriedenheit je Filiale</div>
        </div>
        <nav className="navi">
          {punkte.map((p) => (
            <Link key={p.href} href={p.href} className={pfad.startsWith(p.href) ? 'an' : ''}>
              {p.text}
            </Link>
          ))}
          <span className="wer">
            {profil.name || profil.email} · {ROLLEN_TEXT[profil.rolle]}
          </span>
          <button className="btn leise" onClick={abmelden}>Abmelden</button>
        </nav>
      </div>
    </header>
  );
}
