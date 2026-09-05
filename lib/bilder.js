/**
 * Screenshots aus dem privaten Storage-Bucket für den PDF-Bericht laden.
 *
 * Die Bilder liegen nicht öffentlich, deshalb werden signierte URLs erzeugt.
 * Anschließend läuft jedes Bild über ein Canvas: das vereinheitlicht das
 * Format (jsPDF kann mit manchen WebP-Varianten nicht umgehen) und verkleinert
 * grosse Handy-Screenshots, damit das PDF nicht auf zig Megabyte anwächst.
 */
import { browserClient } from './supabase/client';

const MAX_KANTE = 1000;   // Pixel, längere Seite
const QUALITAET = 0.72;   // JPEG-Qualität

/** Signierte URLs für mehrere Pfade auf einmal - spart Einzelanfragen. */
async function signierteUrls(pfade) {
  if (!pfade.length) return {};
  const { data, error } = await browserClient()
    .storage.from('screenshots').createSignedUrls(pfade, 600);
  if (error || !data) return {};
  return Object.fromEntries(
    data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])
  );
}

/** Bild laden und als JPEG-DataURL samt Seitenverhältnis zurückgeben. */
function ladeAlsJpeg(url) {
  return new Promise((fertig) => {
    const bild = new Image();
    bild.crossOrigin = 'anonymous';

    bild.onload = () => {
      try {
        const faktor = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height));
        const breite = Math.round(bild.width * faktor);
        const hoehe = Math.round(bild.height * faktor);

        const canvas = document.createElement('canvas');
        canvas.width = breite;
        canvas.height = hoehe;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';              // JPEG kennt keine Transparenz
        ctx.fillRect(0, 0, breite, hoehe);
        ctx.drawImage(bild, 0, 0, breite, hoehe);

        fertig({ dataUrl: canvas.toDataURL('image/jpeg', QUALITAET), breite, hoehe });
      } catch {
        fertig(null);   // z. B. wenn das Canvas durch CORS blockiert wird
      }
    };
    bild.onerror = () => fertig(null);
    bild.src = url;
  });
}

/**
 * Reichert Fälle mit ihren Bildern an. Fälle ohne Screenshot oder mit
 * fehlgeschlagenem Laden bleiben erhalten - nur ohne Bild, damit die
 * Bewertung und die Notiz trotzdem im Bericht stehen.
 */
export async function ladeScreenshots(faelle) {
  const mitPfad = faelle.filter((f) => f.screenshot);
  const urls = await signierteUrls(mitPfad.map((f) => f.screenshot));

  const bilder = await Promise.all(
    mitPfad.map(async (f) => {
      const url = urls[f.screenshot];
      return { schluessel: f.id, bild: url ? await ladeAlsJpeg(url) : null };
    })
  );

  const nachId = Object.fromEntries(bilder.map((b) => [b.schluessel, b.bild]));
  return faelle.map((f) => ({ ...f, bild: nachId[f.id] || null }));
}
