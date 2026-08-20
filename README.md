# Gütelhöfer · Filial-Controlling

Wöchentliche Auswertung der WhatsApp-Zufriedenheitsabfrage je Filiale.
Next.js (App Router) · Supabase (Auth, Postgres, Storage) · Vercel.

---

## Leitkennzahl

**„Alles OK!"-Quote = OK-Klicks ÷ erreichte Kunden.**

Sie misst, wie viele der erreichten Kunden aktiv bestätigen, dass alles in
Ordnung war, und liegt naturgemäß nie bei 100 %.

Die Individual-Antworten (Kunden, die selbst geschrieben haben) werden getrennt
erfasst und eingestuft. Sie fließen **nicht** in die Leitkennzahl ein, sondern
ergänzen das qualitative Bild.

**„Erreicht" heißt: gelesen ODER beantwortet ODER OK-Klick.** Superchat leert
den Zeitstempel `Gelesen am`, sobald ein Kunde antwortet — würde man stur die
Spalte nehmen, fielen die aktivsten Kunden aus dem Nenner und die Quote wäre
künstlich zu hoch.

---

## Einrichtung

### 1. Supabase

1. Projekt anlegen auf [supabase.com](https://supabase.com) — **Region: Frankfurt (eu-central-1)**.
2. SQL-Editor öffnen, Inhalt von `supabase/migrations/0001_init.sql` einfügen, ausführen.
3. Unter *Authentication → Providers* „Email" aktivieren, „Confirm email" anlassen.
4. Nutzer anlegen unter *Authentication → Users → Add user*.
5. Rollen setzen — jeder neue Nutzer startet als `betrachter`:

```sql
update profile set rolle = 'admin',      name = 'Nizar'       where id = '<uuid>';
update profile set rolle = 'bearbeiter', name = '<Name>'      where id = '<uuid>';
update profile set rolle = 'betrachter', name = 'Jörg'        where id = '<uuid>';
```

Die UUID steht in der Nutzerliste. Rollen: `admin` und `bearbeiter` dürfen
importieren und bewerten, `betrachter` darf nur lesen.

### 2. Lokal starten

```bash
npm install
cp .env.example .env.local     # URL und Anon Key aus Supabase → Settings → API
npm run dev
```

### 3. GitHub und Vercel

```bash
git init && git add . && git commit -m "Erste Version"
git remote add origin git@github.com:<konto>/guetelhoefer-controlling.git
git push -u origin main
```

Auf [vercel.com](https://vercel.com) das Repo importieren, beide
`NEXT_PUBLIC_*`-Variablen als Environment Variables eintragen, deployen.
Ab dann löst jeder Push automatisch ein Deployment aus — kein manuelles
Hochladen mehr.

Danach in Supabase unter *Authentication → URL Configuration* die
Vercel-Domain als Site URL eintragen.

---

## Wochenablauf

1. **Dienstag** — Kampagnen laufen raus (Bornheim separat, Rest gesammelt).
2. **Mittwoch/Donnerstag** — beide CSV-Exporte ziehen, in der App unter
   *Wochen → Neue Woche anlegen* importieren.
3. Die App trennt automatisch: OK-Klicks zählen sofort, Individual-Antworten
   landen auf der Arbeitsliste.
4. Je offenem Fall: Nummer kopieren, in Superchat suchen, Screenshot anhängen,
   einstufen (Dankeschön / Rückfrage / Problematisch).
5. Wenn *Offen* auf 0 steht, ist die Woche fertig.

---

## Aufbau

```
app/
  layout.js              Rahmen, lädt Profil und Navigation
  login/                 Anmeldung
  wochen/                Übersicht aller Wochen
  wochen/[id]/           Dashboard einer Woche
  trend/                 Wochenverlauf je Filiale
components/              UI-Bausteine
lib/
  berechnung.js          Kennzahlen — hier ändern, nicht in Komponenten
  csv.js                 Spaltenerkennung und Import-Aufbereitung
  filialen.js            Filialen, Wertungsstufen, Rollen
  supabase/              Clients für Browser und Server
middleware.js            Sessionerneuerung und Zugriffsschutz
supabase/migrations/     Datenbankschema
```

**Faustregel:** Kennzahlen ändern sich in `lib/berechnung.js`, nicht in den
Komponenten. Das Datenmodell bleibt identisch, egal ob die Daten aus CSV oder
später aus der Superchat-API kommen — nur die Importschicht wechselt.

### Filialzuordnung

Erste Ziffer der Rechnungsnummer: 1 Bornheim · 2 Bonn-Beuel · 3 Wesseling ·
4 Brühl · 5 Rodenkirchen. Greift das nicht (Bornheim läuft in einer eigenen
Kampagne), wird der Kampagnentitel ausgewertet. Zeilen ohne Zuordnung werden
übersprungen und gemeldet, nicht stillschweigend einer Filiale zugeschlagen.

---

## Datenschutz

In den Daten stehen Klarnamen, Handynummern und über die HMV-Nummer ein
Rückschluss auf Hilfsmittel — also Gesundheitsdaten nach Art. 9 DSGVO.
Vor dem Produktivbetrieb zu klären:

- AV-Verträge mit Supabase und Vercel, EU-Region gewählt
- Löschkonzept: wie lange bleiben Screenshots und Kontaktdaten gespeichert
- Rollenverteilung mit Gütelhöfer schriftlich festhalten (Auftragsverarbeitung)

Die Row Level Security in `0001_init.sql` verhindert Zugriff ohne Anmeldung.
Screenshots liegen in einem privaten Bucket und werden nur über signierte URLs
mit einer Stunde Gültigkeit ausgeliefert.

---

## Nächste Schritte

- [ ] Superchat-API prüfen: liefert sie Nachrichtentexte? Dann entfällt das
      Screenshotten, und `bewertung.antworttext` wird direkt befüllt.
- [ ] CSV-Export der Wochenauswertung für die Meldung an Jörg
- [ ] Zielwert je Filiale statt Vergleich am Wochendurchschnitt, sobald
      genug Wochen im Archiv liegen (`lib/berechnung.js`, Funktion `farbe`)
- [ ] Woche abschließen und sperren, damit Zahlen im Nachhinein feststehen
