'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import KpiZeile from './KpiZeile';
import FilialTabelle from './FilialTabelle';
import WochenCharts from './WochenCharts';
import FallListe from './FallListe';
import CsvImport from './CsvImport';
import WocheVerwalten from './WocheVerwalten';

export default function WochenDashboard({ woche, statistik, faelle, darfSchreiben }) {
  const router = useRouter();
  const [importOffen, setImportOffen] = useState(statistik.length === 0);

  const neuLaden = () => router.refresh();

  return (
    <>
      {darfSchreiben && (
        <section className="karte">
          <div className="zeile" style={{ justifyContent: 'space-between', marginBottom: importOffen ? 16 : 0 }}>
            <h2 style={{ margin: 0 }}>Kampagnen-Exporte
              <small>Bornheim und „Alle außer Bornheim“ zusammen importieren.</small>
            </h2>
            <button className="btn leise" onClick={() => setImportOffen(!importOffen)}>
              {importOffen ? 'Import ausblenden' : 'CSV importieren'}
            </button>
          </div>
          {importOffen && <CsvImport wocheId={woche.id} onFertig={neuLaden} />}
          <WocheVerwalten
            woche={woche}
            hatDaten={statistik.length > 0}
            onGeleert={() => setImportOffen(true)}
          />
        </section>
      )}

      <KpiZeile statistik={statistik} />

      <section className="zwei">
        <div className="karte">
          <h2 className="abstand">„Alles OK!“-Quote je Filiale
            <small>Bestätigungen im Verhältnis zu den erreichten Kunden</small>
          </h2>
          <WochenCharts statistik={statistik} art="balken" />
        </div>
        <div className="karte">
          <h2 className="abstand">Rücklauf gesamt <small>Verteilung aller gesendeten Nachrichten</small></h2>
          <WochenCharts statistik={statistik} art="ring" />
        </div>
      </section>

      <section className="karte">
        <h2 className="abstand">Detailauswertung je Filiale
          <small>Rechts die Individual-Antworten, getrennt von der Leitkennzahl.</small>
        </h2>
        <FilialTabelle statistik={statistik} />
      </section>

      <section className="karte">
        <h2 className="abstand">Individual-Antworten bewerten
          <small>Nummer kopieren, in Superchat suchen, Screenshot anhängen und einstufen.
            Die Einstufung verändert die „Alles OK!“-Quote nicht.</small>
        </h2>
        <FallListe faelle={faelle} darfSchreiben={darfSchreiben} onAenderung={neuLaden} />
      </section>
    </>
  );
}
