/**
 * Import der Superchat-Kampagnenexporte.
 *
 * Die Spaltennamen wechseln je nach Vorlage ("Kopf.Rechnung:" statt
 * "Rechnungsnummer"), deshalb wird auf Namensbestandteile geprüft
 * statt auf exakte Übereinstimmung.
 */
import { FILIALEN } from './filialen';

function findeSpalte(kopf, muster) {
  return kopf.find((s) => {
    const n = s.toLowerCase().replace(/[.:\s_-]/g, '');
    return muster.some((m) => n.includes(m));
  });
}

export function baueSchema(kopf) {
  return {
    rechnung: findeSpalte(kopf, ['rechnung', 'invoice', 'belegnr']),
    ok:       findeSpalte(kopf, ['schnellantwort', 'allesok', 'quickreply']),
    antwort:  findeSpalte(kopf, ['beantwortetam', 'antwortam', 'repliedat']),
    gelesen:  findeSpalte(kopf, ['gelesenam', 'readat']),
    gesendet: findeSpalte(kopf, ['gesendetam', 'sentat']),
    titel:    findeSpalte(kopf, ['kampagnentitel', 'campaignname', 'kampagne']),
    vorname:  findeSpalte(kopf, ['vorname', 'firstname']),
    nachname: findeSpalte(kopf, ['nachname', 'lastname']),
    telefon:  findeSpalte(kopf, ['telefon', 'phone', 'mobil']),
    kontakt:  findeSpalte(kopf, ['kontaktid', 'contactid']),
  };
}

export const voll = (w) => w !== undefined && w !== null && String(w).trim() !== '';

export function telefonSchoen(t) {
  const z = String(t ?? '').replace(/\D/g, '');
  if (!z) return '';
  return z.startsWith('49') ? `+${z}` : z;
}

/**
 * Filiale zuerst über die Rechnungsnummer, ersatzweise über den
 * Kampagnentitel - Bornheim läuft in einer eigenen Kampagne und hat
 * deshalb nicht zwingend eine passende Rechnungsnummer.
 */
export function bestimmeFiliale(zeile, schema, dateiname = '') {
  if (schema.rechnung) {
    const erste = String(zeile[schema.rechnung] ?? '').replace(/\D/g, '').charAt(0);
    if (FILIALEN[erste]) return Number(erste);
  }
  const quelle = `${schema.titel ? zeile[schema.titel] : ''} ${dateiname}`.toLowerCase();
  if (quelle.includes('bornheim') && !/au(ß|ss)er bornheim/.test(quelle)) return 1;
  for (const [id, name] of Object.entries(FILIALEN)) {
    if (quelle.includes(name.toLowerCase())) return Number(id);
  }
  return null;
}

const zeit = (w) => (voll(w) ? new Date(w).toISOString() : null);

/**
 * Wandelt geparste CSV-Zeilen in Kontakt- und Sendungsdatensätze um.
 * Rückgabe enthält auch die übersprungenen Zeilen, damit der Import
 * dem Nutzer sagen kann, was nicht zugeordnet werden konnte.
 */
export function bereiteImportVor(zeilen, dateiname = '') {
  if (!zeilen.length) return { datensaetze: [], ohneFiliale: 0, doppelt: 0, fehlend: ['keine Zeilen'], kampagnen: [] };

  const schema = baueSchema(Object.keys(zeilen[0]));
  const fehlend = [];
  if (!schema.rechnung) fehlend.push('Rechnungsnummer');
  if (!schema.ok) fehlend.push('„Alles OK!“-Schnellantwort');

  const datensaetze = [];
  const gesehen = new Set();
  const kampagnen = new Set();
  let ohneFiliale = 0;
  let doppelt = 0;

  zeilen.forEach((z) => {
    if (schema.titel && voll(z[schema.titel])) kampagnen.add(String(z[schema.titel]).trim());

    const filiale = bestimmeFiliale(z, schema, dateiname);
    if (!filiale) { ohneFiliale += 1; return; }

    const telefon = telefonSchoen(schema.telefon ? z[schema.telefon] : '');
    const rechnung = schema.rechnung ? String(z[schema.rechnung] ?? '').trim() : '';
    const superchat_id = schema.kontakt && voll(z[schema.kontakt])
      ? String(z[schema.kontakt]).trim()
      : `${telefon}|${rechnung}`;

    if (gesehen.has(superchat_id)) { doppelt += 1; return; }
    gesehen.add(superchat_id);

    datensaetze.push({
      kontakt: {
        superchat_id,
        name: [schema.vorname && z[schema.vorname], schema.nachname && z[schema.nachname]]
          .filter(voll).join(' ').trim() || 'Ohne Namen',
        telefon,
        rechnung,
        filiale,
      },
      sendung: {
        kampagne: schema.titel ? String(z[schema.titel] ?? '').trim() : '',
        gesendet_am: schema.gesendet ? zeit(z[schema.gesendet]) : null,
        gelesen_am: schema.gelesen ? zeit(z[schema.gelesen]) : null,
        beantwortet_am: schema.antwort ? zeit(z[schema.antwort]) : null,
        ok_am: schema.ok ? zeit(z[schema.ok]) : null,
      },
    });
  });

  return { datensaetze, ohneFiliale, doppelt, fehlend, kampagnen: [...kampagnen] };
}
