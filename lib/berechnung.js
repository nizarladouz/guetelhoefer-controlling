/**
 * Kennzahlen des Filial-Controllings.
 *
 * Leitkennzahl ist die "Alles OK!"-Quote: bestätigte Zufriedenheit im
 * Verhältnis zu den erreichten Kunden. Die Einstufung der Individual-
 * Antworten läuft bewusst daneben und fließt nicht in diese Quote ein.
 */

export const leereZeile = () => ({
  gesendet: 0, erreicht: 0, ok: 0,
  individual: 0, danke: 0, rueckfrage: 0, negativ: 0, offen: 0,
});

export const quote = (teil, ganzes) => (ganzes > 0 ? (teil / ganzes) * 100 : null);

export const zeigeQuote = (q) =>
  q === null || q === undefined ? '–' : `${Number(q).toFixed(1).replace('.', ',')} %`;

/** Die Leitkennzahl. Nenner ist "erreicht", nicht "gesendet". */
export const okQuote = (zeile) => quote(zeile.ok, zeile.erreicht);

export const oeffnungsrate = (zeile) => quote(zeile.erreicht, zeile.gesendet);

export function summiere(zeilen) {
  return zeilen.reduce((summe, z) => {
    Object.keys(summe).forEach((k) => { summe[k] += z[k] || 0; });
    return summe;
  }, leereZeile());
}

/**
 * Ohne historischen Zielwert ist der Wochendurchschnitt der ehrlichste
 * Maßstab: grün über dem Schnitt, gelb knapp darunter, rot deutlich darunter.
 * Sobald genug Wochen im Archiv liegen, kann hier ein fester Zielwert stehen.
 */
export function farbe(q, schnitt) {
  if (q === null || schnitt === null || schnitt === undefined) return 'var(--text-leise)';
  if (q >= schnitt) return 'var(--gruen)';
  if (q >= schnitt - 8) return 'var(--warn)';
  return 'var(--neg)';
}

/** Unter zehn erreichten Kunden schwankt die Quote zu stark für einen Vergleich. */
export const STICHPROBE_MINDEST = 10;
