/**
 * PDF-Bericht für einen gewählten Zeitraum, ein Abschnitt je Filiale.
 *
 * jsPDF wird erst beim Klick geladen (dynamischer Import), damit die
 * Bibliothek nicht im Server-Bundle landet und die Seite schneller startet.
 */
import { okQuote, oeffnungsrate, zeigeQuote } from './berechnung';
import { wochenLabel } from './zeitraum';

const GRUEN = [161, 186, 77];
const ANTHRAZIT = [46, 57, 71];
const GRAU = [120, 130, 140];

export async function erzeugePdf({ zeitraumText, anzahlWochen, filialen, gesamt }) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const breite = doc.internal.pageSize.getWidth();
  const rand = 16;

  kopfzeile(doc, breite, rand, zeitraumText, anzahlWochen);

  let y = 46;

  // ---------- Gesamtübersicht ----------
  if (filialen.length > 1) {
    y = abschnittTitel(doc, 'Übersicht aller Filialen', rand, y);

    autoTable(doc, {
      startY: y,
      margin: { left: rand, right: rand },
      head: [['Filiale', 'Gesendet', 'Erreicht', 'Öffnung', '"Alles OK!"', 'Quote', 'Individual', 'Problem.']],
      body: filialen.map((f) => [
        f.name,
        f.gesendet,
        f.erreicht,
        zeigeQuote(oeffnungsrate(f)),
        f.ok,
        zeigeQuote(okQuote(f)),
        f.individual || '–',
        f.negativ || '–',
      ]),
      foot: [[
        'Gesamt',
        gesamt.gesendet,
        gesamt.erreicht,
        zeigeQuote(oeffnungsrate(gesamt)),
        gesamt.ok,
        zeigeQuote(okQuote(gesamt)),
        gesamt.individual || '–',
        gesamt.negativ || '–',
      ]],
      ...tabellenStil(),
    });

    y = doc.lastAutoTable.finalY + 12;
  }

  // ---------- Je Filiale ----------
  filialen.forEach((f, i) => {
    const platzNoetig = 30 + f.verlauf.length * 7;
    if (y + platzNoetig > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      kopfzeile(doc, breite, rand, zeitraumText, anzahlWochen);
      y = 46;
    }

    y = abschnittTitel(doc, f.name, rand, y);

    // Kennzahlen-Zeile
    doc.setFontSize(9);
    doc.setTextColor(...GRAU);
    doc.text(
      `"Alles OK!"-Quote: ${zeigeQuote(okQuote(f))}   ·   ${f.ok} von ${f.erreicht} erreichten Kunden   ·   `
      + `${f.individual} Individual-Antworten (${f.negativ} problematisch, ${f.offen} offen)`,
      rand, y
    );
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: rand, right: rand },
      head: [['Woche', 'Gesendet', 'Erreicht', '"Alles OK!"', 'Quote', 'Individual', 'Dankeschön', 'Rückfrage', 'Problem.']],
      body: f.verlauf.map((w) => [
        wochenLabel(w.jahr, w.kw),
        w.gesendet,
        w.erreicht,
        w.ok,
        zeigeQuote(okQuote(w)),
        w.individual || '–',
        w.danke || '–',
        w.rueckfrage || '–',
        w.negativ || '–',
      ]),
      ...tabellenStil(),
    });

    y = doc.lastAutoTable.finalY + 12;
    if (i < filialen.length - 1) y += 2;
  });

  fusszeilen(doc, breite, rand);

  const dateiname = `Kundenzufriedenheit_${zeitraumText.replace(/[^\w]+/g, '_')}.pdf`;
  doc.save(dateiname);
}

/* ---------- Bausteine ---------- */

function kopfzeile(doc, breite, rand, zeitraumText, anzahlWochen) {
  doc.setFillColor(...ANTHRAZIT);
  doc.rect(0, 0, breite, 30, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('Gütelhöfer', rand, 14);
  doc.setTextColor(...GRUEN);
  doc.text('· Filial-Controlling', rand + 32, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 190, 200);
  doc.text('KUNDENZUFRIEDENHEIT JE FILIALE', rand, 21);

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `${zeitraumText}  ·  ${anzahlWochen} ${anzahlWochen === 1 ? 'Woche' : 'Wochen'}`,
    breite - rand, 14, { align: 'right' }
  );
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 200);
  doc.text(
    `Erstellt am ${new Date().toLocaleDateString('de-DE')}`,
    breite - rand, 21, { align: 'right' }
  );

  doc.setDrawColor(...GRUEN);
  doc.setLineWidth(1);
  doc.line(0, 30, breite, 30);
}

function abschnittTitel(doc, text, rand, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...ANTHRAZIT);
  doc.text(text, rand, y);
  doc.setFont('helvetica', 'normal');
  return y + 6;
}

function tabellenStil() {
  return {
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2, textColor: [40, 48, 58] },
    headStyles: { fillColor: ANTHRAZIT, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: [235, 238, 240], textColor: ANTHRAZIT, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 251] },
    columnStyles: { 0: { halign: 'left' } },
    didParseCell: (data) => { if (data.column.index > 0) data.cell.styles.halign = 'center'; },
  };
}

function fusszeilen(doc, breite, rand) {
  const seiten = doc.internal.getNumberOfPages();
  for (let i = 1; i <= seiten; i += 1) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAU);
    doc.text('Ladouz Digital · Filial-Controlling Kundenzufriedenheit',
      rand, doc.internal.pageSize.getHeight() - 10);
    doc.text(`Seite ${i} von ${seiten}`,
      breite - rand, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
  }
}
