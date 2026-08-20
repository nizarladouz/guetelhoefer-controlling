'use client';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { FILIALEN } from '@/lib/filialen';
import { okQuote } from '@/lib/berechnung';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const LINIENFARBEN = { 1: '#A1BA4D', 2: '#6FA8C7', 3: '#E0A33E', 4: '#D96A5B', 5: '#BDD275' };

export default function TrendAnsicht({ statistik }) {
  if (!statistik.length) {
    return <div className="leer">Noch keine Wochen erfasst.</div>;
  }

  // Wochen chronologisch, Beschriftung "KW 33"
  const wochen = [...new Set(statistik.map((s) => `${s.jahr}-${String(s.kw).padStart(2, '0')}`))].sort();
  const label = (w) => `KW ${Number(w.split('-')[1])}`;

  const datensaetze = Object.keys(FILIALEN).map((id) => ({
    label: FILIALEN[id],
    data: wochen.map((w) => {
      const [jahr, kw] = w.split('-');
      const zeile = statistik.find(
        (s) => s.filiale === Number(id) && s.jahr === Number(jahr) && s.kw === Number(kw)
      );
      // null lässt die Linie unterbrechen, statt einen Einbruch auf 0 vorzutäuschen
      return zeile ? okQuote(zeile) : null;
    }),
    borderColor: LINIENFARBEN[id],
    backgroundColor: LINIENFARBEN[id],
    borderWidth: 2,
    pointRadius: 3,
    tension: 0.25,
    spanGaps: true,
  })).filter((d) => d.data.some((v) => v !== null));

  return (
    <div className="chartbox" style={{ height: 360 }}>
      <Line
        data={{ labels: wochen.map(label), datasets: datensaetze }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { color: '#9AA7B4', font: { family: 'Lato', size: 11 }, boxWidth: 11, padding: 12 } },
            tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${Number(c.parsed.y).toFixed(1).replace('.', ',')} %` } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#9AA7B4', font: { family: 'Lato', size: 12 } } },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(237,240,242,.07)' },
              ticks: { color: '#9AA7B4', font: { family: 'Lato', size: 12 }, callback: (v) => `${v} %` },
            },
          },
        }}
      />
    </div>
  );
}
