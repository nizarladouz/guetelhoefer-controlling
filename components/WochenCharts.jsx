'use client';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { FILIALEN } from '@/lib/filialen';
import { summiere, okQuote, farbe } from '@/lib/berechnung';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

const TICK = { color: '#9AA7B4', font: { family: 'Lato', size: 12 } };
const GITTER = { color: 'rgba(237,240,242,.07)' };
const LEGENDE = {
  position: 'bottom',
  labels: { color: '#9AA7B4', font: { family: 'Lato', size: 11 }, boxWidth: 11, padding: 12 },
};

export default function WochenCharts({ statistik, art }) {
  if (!statistik.length) return <div className="leer">Noch keine Daten importiert.</div>;

  const zeilen = [...statistik].sort((a, b) => a.filiale - b.filiale);
  const gesamt = summiere(zeilen);
  const schnitt = okQuote(gesamt);

  if (art === 'balken') {
    const werte = zeilen.map((z) => { const q = okQuote(z); return q === null ? 0 : Number(q.toFixed(1)); });
    const hoechst = Math.max(20, Math.ceil(Math.max(...werte, schnitt || 0) / 10) * 10 + 10);

    return (
      <div className="chartbox">
        <Bar
          data={{
            labels: zeilen.map((z) => FILIALEN[z.filiale]),
            datasets: [
              {
                type: 'bar',
                label: '„Alles OK!“-Quote',
                data: werte,
                backgroundColor: werte.map((w) => farbe(w, schnitt)),
                borderRadius: 3,
                maxBarThickness: 56,
              },
              {
                type: 'line',
                label: 'Schnitt aller Filialen',
                data: zeilen.map(() => (schnitt === null ? 0 : Number(schnitt.toFixed(1)))),
                borderColor: '#EDF0F2', borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0,
              },
            ],
          }}
          options={{
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: LEGENDE,
              tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y.toFixed(1).replace('.', ',')} %` } },
            },
            scales: {
              x: { grid: { display: false }, ticks: TICK },
              y: { beginAtZero: true, max: hoechst, grid: GITTER, ticks: { ...TICK, callback: (v) => `${v} %` } },
            },
          }}
        />
      </div>
    );
  }

  const ohne = Math.max(0, gesamt.gesendet - gesamt.ok - gesamt.individual);
  return (
    <div className="chartbox">
      <Doughnut
        data={{
          labels: ['„Alles OK!“ geklickt', 'Individual-Antwort', 'Ohne Rückmeldung'],
          datasets: [{
            data: [gesamt.ok, gesamt.individual, ohne],
            backgroundColor: ['#A1BA4D', '#6FA8C7', '#46525F'],
            borderWidth: 0,
          }],
        }}
        options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: LEGENDE } }}
      />
    </div>
  );
}
