/**
 * PDF-Bericht für einen gewählten Zeitraum.
 *
 * Aufbau:
 *   1. Gesamtbewertung über alle ausgewählten Filialen
 *   2. Vergleichstabelle, eine Zeile je Filiale
 *   3. Je Filiale: Kennzahlen für den Zeitraum, darunter die Rückmeldungen
 *      mit Screenshot
 *
 * Bewusst ohne Wochenaufschlüsselung - der Bericht zeigt die Summe des
 * gewählten Zeitraums, nicht dessen einzelne Wochen.
 *
 * jsPDF wird erst beim Klick geladen (dynamischer Import), damit die
 * Bibliothek nicht im Server-Bundle landet.
 */
import { okQuote, oeffnungsrate, zeigeQuote } from './berechnung';
import { wochenLabel } from './zeitraum';
import { WERTUNGEN } from './filialen';

const GRUEN = [161, 186, 77];
const ANTHRAZIT = [46, 57, 71];
const GRAU = [120, 130, 140];
const INFO = [111, 168, 199];
const NEG = [217, 106, 91];
const WARN = [224, 163, 62];

const WERTUNG_FARBE = { danke: GRUEN, rueckfrage: INFO, negativ: NEG };

const A4_HOEHE = 297;
const A4_BREITE = 210;
const RAND = 16;
const FUSS = 20;

export async function erzeugePdf({ zeitraumText, anzahlWochen, filialen, gesamt, mitScreenshots }) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const seite = { doc, zeitraumText, anzahlWochen };

  kopfzeile(seite);
  let y = 44;

  // ---------- 1. Gesamtbewertung ----------
  y = gesamtbewertung(doc, gesamt, filialen, anzahlWochen, y);

  // ---------- 2. Vergleich der Filialen ----------
  if (filialen.length > 1) {
    y = abschnittTitel(doc, 'Filialvergleich im Zeitraum', y);

    autoTable(doc, {
      startY: y,
      margin: { left: RAND, right: RAND },
      head: [['Filiale', 'Gesendet', 'Erreicht', 'Öffnung', '"Alles OK!"', 'Quote',
              'Individual', 'Danke', 'Rückfrage', 'Problem.', 'Offen']],
      body: filialen.map((f) => [
        f.name, f.gesendet, f.erreicht, zeigeQuote(oeffnungsrate(f)),
        f.ok, zeigeQuote(okQuote(f)),
        f.individual || '–', f.danke || '–', f.rueckfrage || '–', f.negativ || '–', f.offen || '–',
      ]),
      foot: [[
        'Gesamt', gesamt.gesendet, gesamt.erreicht, zeigeQuote(oeffnungsrate(gesamt)),
        gesamt.ok, zeigeQuote(okQuote(gesamt)),
        gesamt.individual || '–', gesamt.danke || '–', gesamt.rueckfrage || '–',
        gesamt.negativ || '–', gesamt.offen || '–',
      ]],
      ...tabellenStil(),
    });

    y = doc.lastAutoTable.finalY + 12;
  }

  // ---------- 3. Je Filiale ----------
  filialen.forEach((f, i) => {
    // Eigene Seite je Filiale, sobald mehrere im Bericht sind - so bleibt
    // der Ausdruck je Filiale einzeln weitergebbar.
    if (filialen.length > 1 || i > 0) {
      doc.addPage();
      kopfzeile(seite);
      y = 44;
    }

    y = abschnittTitel(doc, f.name, y, 13);

    // Kennzahlen des Zeitraums als kompakte Tabelle
    autoTable(doc, {
      startY: y,
      margin: { left: RAND, right: RAND },
      head: [['Gesendet', 'Erreicht', 'Öffnungsrate', '"Alles OK!"', '"Alles OK!"-Quote',
              'Individual', 'Danke', 'Rückfrage', 'Problem.', 'Offen']],
      body: [[
        f.gesendet, f.erreicht, zeigeQuote(oeffnungsrate(f)), f.ok, zeigeQuote(okQuote(f)),
        f.individual || '–', f.danke || '–', f.rueckfrage || '–', f.negativ || '–', f.offen || '–',
      ]],
      ...tabellenStil(),
      columnStyles: {},
      didParseCell: (data) => { data.cell.styles.halign = 'center'; },
    });

    y = doc.lastAutoTable.finalY + 10;

    if (f.faelle?.length) {
      y = rueckmeldungen(seite, f, y, mitScreenshots);
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...GRAU);
      doc.text('Keine Individual-Rückmeldungen in diesem Zeitraum.', RAND, y);
      y += 8;
    }
  });

  fusszeilen(doc);

  const dateiname = `Kundenzufriedenheit_${zeitraumText.replace(/[^\w]+/g, '_')}.pdf`;
  doc.save(dateiname);
}

/* ---------- Gesamtbewertung oben ---------- */

function gesamtbewertung(doc, gesamt, filialen, anzahlWochen, y) {
  const quote = okQuote(gesamt);

  doc.setFillColor(246, 248, 245);
  doc.setDrawColor(...GRUEN);
  doc.setLineWidth(0.4);
  doc.roundedRect(RAND, y, A4_BREITE - 2 * RAND, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAU);
  doc.text('GESAMTBEWERTUNG', RAND + 6, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...GRUEN);
  doc.text(zeigeQuote(quote), RAND + 6, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...ANTHRAZIT);
  doc.text('"Alles OK!"-Quote', RAND + 6, y + 26.5);

  // Kennzahlen rechts daneben
  const werte = [
    ['Gesendet', String(gesamt.gesendet)],
    ['Erreicht', String(gesamt.erreicht)],
    ['Bestätigt', String(gesamt.ok)],
    ['Rückmeldungen', String(gesamt.individual)],
    ['Problematisch', String(gesamt.negativ)],
  ];
  const startX = RAND + 58;
  const spalte = (A4_BREITE - 2 * RAND - 62) / werte.length;

  werte.forEach(([label, wert], i) => {
    const x = startX + i * spalte;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...ANTHRAZIT);
    doc.text(wert, x, y + 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAU);
    doc.text(label.toUpperCase(), x, y + 22.5);
  });

  y += 36;

  doc.setFontSize(8.5);
  doc.setTextColor(...GRAU);
  const namen = filialen.map((f) => f.name).join(', ');
  doc.text(
    `Zeitraum: ${anzahlWochen} ${anzahlWochen === 1 ? 'Kalenderwoche' : 'Kalenderwochen'}   ·   `
    + `${filialen.length} ${filialen.length === 1 ? 'Filiale' : 'Filialen'}: ${namen}`,
    RAND, y
  );

  return y + 10;
}

/* ---------- Rückmeldungen mit Screenshot ---------- */

function rueckmeldungen(seite, filiale, y, mitScreenshots) {
  const { doc } = seite;

  y = platzPruefen(seite, y, 18);
  y = abschnittTitel(doc, `Rückmeldungen der Kunden (${filiale.faelle.length})`, y, 10);

  filiale.faelle.forEach((fall) => {
    const bildHoehe = mitScreenshots && fall.bild ? bildMasse(fall.bild).hoehe + 6 : 0;
    y = platzPruefen(seite, y, 14 + bildHoehe + (fall.notiz ? 8 : 0));

    const farbe = fall.wertung ? WERTUNG_FARBE[fall.wertung] : WARN;
    doc.setFillColor(...farbe);
    doc.rect(RAND, y - 3.2, 1.6, 5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...ANTHRAZIT);
    doc.text(fall.name, RAND + 4, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAU);
    const meta = [
      wochenLabel(fall.jahr, fall.kw),
      fall.rechnung ? `Rg. ${fall.rechnung}` : null,
      fall.wertung ? WERTUNGEN[fall.wertung].text : 'noch nicht eingestuft',
    ].filter(Boolean).join('   ·   ');
    doc.text(meta, A4_BREITE - RAND, y, { align: 'right' });
    y += 5;

    if (fall.notiz) {
      doc.setFontSize(8.5);
      doc.setTextColor(70, 80, 92);
      const zeilen = doc.splitTextToSize(fall.notiz, A4_BREITE - 2 * RAND - 4);
      doc.text(zeilen, RAND + 4, y);
      y += zeilen.length * 4 + 1;
    }

    if (mitScreenshots && fall.bild) {
      const { breite, hoehe } = bildMasse(fall.bild);
      doc.addImage(fall.bild.dataUrl, 'JPEG', RAND + 4, y, breite, hoehe);
      doc.setDrawColor(215, 220, 225);
      doc.setLineWidth(0.2);
      doc.rect(RAND + 4, y, breite, hoehe);
      y += hoehe + 5;
    } else if (mitScreenshots) {
      doc.setFontSize(8);
      doc.setTextColor(...GRAU);
      doc.text('Kein Screenshot hinterlegt.', RAND + 4, y + 1);
      y += 5;
    } else {
      y += 1;
    }

    doc.setDrawColor(230, 234, 238);
    doc.setLineWidth(0.2);
    doc.line(RAND, y, A4_BREITE - RAND, y);
    y += 5;
  });

  return y;
}

/** Screenshots hochkant begrenzen, damit einer nicht die ganze Seite füllt. */
function bildMasse(bild) {
  const maxBreite = 62;
  const maxHoehe = 88;
  const faktor = Math.min(maxBreite / bild.breite, maxHoehe / bild.hoehe);
  return { breite: bild.breite * faktor, hoehe: bild.hoehe * faktor };
}

/* ---------- Bausteine ---------- */

function platzPruefen(seite, y, noetig) {
  if (y + noetig > A4_HOEHE - FUSS) {
    seite.doc.addPage();
    kopfzeile(seite);
    return 44;
  }
  return y;
}

function kopfzeile({ doc, zeitraumText, anzahlWochen }) {
  doc.setFillColor(...ANTHRAZIT);
  doc.rect(0, 0, A4_BREITE, 30, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('Gütelhöfer', RAND, 14);
  doc.setTextColor(...GRUEN);
  doc.text('· Filial-Controlling', RAND + 32, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 190, 200);
  doc.text('KUNDENZUFRIEDENHEIT JE FILIALE', RAND, 21);

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `${zeitraumText}  ·  ${anzahlWochen} ${anzahlWochen === 1 ? 'Woche' : 'Wochen'}`,
    A4_BREITE - RAND, 14, { align: 'right' }
  );
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 200);
  doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')}`,
    A4_BREITE - RAND, 21, { align: 'right' });

  doc.setDrawColor(...GRUEN);
  doc.setLineWidth(1);
  doc.line(0, 30, A4_BREITE, 30);
}

function abschnittTitel(doc, text, y, groesse = 11) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(groesse);
  doc.setTextColor(...ANTHRAZIT);
  doc.text(text, RAND, y);
  doc.setFont('helvetica', 'normal');
  return y + 6;
}

function tabellenStil() {
  return {
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.4, textColor: [40, 48, 58] },
    headStyles: { fillColor: ANTHRAZIT, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.8 },
    footStyles: { fillColor: [235, 238, 240], textColor: ANTHRAZIT, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 251] },
    columnStyles: { 0: { halign: 'left' } },
    didParseCell: (data) => { if (data.column.index > 0) data.cell.styles.halign = 'center'; },
  };
}

function fusszeilen(doc) {
  const seiten = doc.internal.getNumberOfPages();
  for (let i = 1; i <= seiten; i += 1) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAU);
    doc.text('Ladouz Digital · Filial-Controlling Kundenzufriedenheit', RAND, A4_HOEHE - 10);
    doc.text(`Seite ${i} von ${seiten}`, A4_BREITE - RAND, A4_HOEHE - 10, { align: 'right' });
  }
}
