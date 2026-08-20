import './globals.css';
import { holeProfil } from '@/lib/supabase/server';
import Navigation from '@/components/Navigation';

export const metadata = {
  title: 'Gütelhöfer · Filial-Controlling',
  description: 'Kundenzufriedenheit je Filiale, wöchentlich ausgewertet',
};

export default async function RootLayout({ children }) {
  const profil = await holeProfil();
  return (
    <html lang="de">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        {profil && <Navigation profil={profil} />}
        {children}
      </body>
    </html>
  );
}
