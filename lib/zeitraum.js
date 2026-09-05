/**
 * Zeitraum-Auswahl und Aggregation über mehrere Wochen.
 *
 * Die Statistik-View liefert eine Zeile je Woche und Filiale. Für einen
 * Zeitraum werden diese Zeilen je Filiale aufsummiert - die Quoten werden
 * dabei NEU aus den Summen berechnet, nicht als Mittelwert der Wochenquoten.
 * Ein Mittelwert würde eine Woche mit 3 Kunden genauso stark gewichten wie
 * eine mit 40 und das Ergebnis verzerren.
 */
import { leereZeile } from './berechnung';

/** Sortierschlüssel "2026-33" für chronologische Ordnung über Jahresgrenzen. */
export const wochenSchluessel = (jahr, kw) => `${jahr}-${String(kw).padStart(2, '0')}`;

export const wochenLabel = (jahr, kw) => `KW ${kw}/${String(jahr).slice(2)}`;

/** Alle in den Daten vorkommenden Wochen, chronologisch, neueste zuerst. */
export function verfuegbareWochen(statistik) {
  const gesehen = new Map();
  statistik.forEach((s) => {
    const k = wochenSchluessel(s.jahr, s.kw);
    if (!gesehen.has(k)) gesehen.set(k, { jahr: s.jahr, kw: s.kw, schluessel: k });
  });
  return [...gesehen.values()].sort((a, b) => b.schluessel.localeCompare(a.schluessel));
}

/**
 * Vorgefertigte Zeiträume. "anzahl" zählt vorhandene Wochen, nicht
 * Kalenderwochen - wenn eine Woche fehlt, wird die nächste vorhandene
 * genommen statt eine Lücke zu erzeugen.
 */
export const VORLAGEN = [
  { id: 'letzte4',  text: 'Letzte 4 Wochen',  anzahl: 4 },
  { id: 'letzte8',  text: 'Letzte 8 Wochen',  anzahl: 8 },
  { id: 'letzte12', text: 'Letzte 12 Wochen', anzahl: 12 },
  { id: 'alle',     text: 'Gesamter Zeitraum', anzahl: null },
];

export function vorlageAnwenden(wochen, anzahl) {
  if (!wochen.length) return { von: null, bis: null };
  const auswahl = anzahl ? wochen.slice(0, anzahl) : wochen;
  return {
    von: auswahl[auswahl.length - 1].schluessel,   // älteste
    bis: auswahl[0].schluessel,                    // neueste
  };
}

/** Filtert die Statistik auf den gewählten Bereich (beide Grenzen inklusive). */
export function imZeitraum(statistik, von, bis) {
  if (!von || !bis) return statistik;
  return statistik.filter((s) => {
    const k = wochenSchluessel(s.jahr, s.kw);
    return k >= von && k <= bis;
  });
}

/** Eine Summenzeile je Filiale über den gesamten Zeitraum. */
export function aggregiereProFiliale(zeilen) {
  const proFiliale = {};
  zeilen.forEach((z) => {
    if (!proFiliale[z.filiale]) proFiliale[z.filiale] = { ...leereZeile(), filiale: z.filiale, wochen: 0 };
    const f = proFiliale[z.filiale];
    Object.keys(leereZeile()).forEach((k) => { f[k] += z[k] || 0; });
    f.wochen += 1;
  });
  return Object.values(proFiliale).sort((a, b) => a.filiale - b.filiale);
}

/** Wochenweiser Verlauf einer Filiale, für die Detailtabelle im PDF. */
export function verlaufFuerFiliale(zeilen, filiale) {
  return zeilen
    .filter((z) => z.filiale === filiale)
    .sort((a, b) => wochenSchluessel(a.jahr, a.kw).localeCompare(wochenSchluessel(b.jahr, b.kw)));
}
