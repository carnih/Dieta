// Disegno grafici DASHBOARD con Chart.js (pacchetto npm 'chart.js', non CDN).
// Porta `drawDashCharts` del monolite: stesse config, stessi colori, stessi assi.
// Esposto come funzione `drawDashCharts(...)` che disegna nei <canvas> per id e
// restituisce le istanze Chart create (così il chiamante le distrugge a smontaggio).

import { Chart, registerables } from 'chart.js';
import type { ChartConfiguration } from 'chart.js';
import { DASH_COL, DASH_LBL, mlabel } from '@/pages/dashboard/computeDash';
import type { DashData } from '@/pages/dashboard/computeDash';

// Chart.js v4 modulare: registro tutti i componenti (equivalente al bundle CDN auto).
let _registered = false;
function ensureRegistered() {
  if (_registered) return;
  Chart.register(...registerables);
  _registered = true;
}

/** mmss locale per i tick passo (identico al monolite). */
function mmssTick(v: number): string {
  const m = Math.floor(v),
    s = Math.round((v - m) * 60);
  return m + ':' + (s < 10 ? '0' + s : s);
}

/**
 * Grafici della pagina dettaglio disciplina ("Ore per mese", canvas `cDet`).
 * Ritorna le Chart create.
 */
export function drawDetailChart(D: DashData, dashDetail: string): Chart[] {
  ensureRegistered();
  const charts: Chart[] = [];
  const el = document.getElementById('cDet') as HTMLCanvasElement | null;
  if (!el) return charts;
  const hrs =
    dashDetail === 'altri'
      ? D.volAltri.map((x) => +x.toFixed(1))
      : D.months.map((_m, i) => +((D.vol[dashDetail] || [])[i] || 0).toFixed(1));
  charts.push(
    new Chart(el, {
      type: 'bar',
      data: {
        labels: D.months.map(mlabel),
        datasets: [{ data: hrs, backgroundColor: DASH_COL[dashDetail] || '#94A3B8', borderRadius: 4 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, title: { display: true, text: 'ore' } } },
      },
    }),
  );
  return charts;
}

/** Grafici della dashboard principale (6 canvas). Ritorna le Chart create. */
export function drawDashCharts(D: DashData): Chart[] {
  ensureRegistered();
  const charts: Chart[] = [];
  if (!D.A.length) return charts;
  Chart.defaults.font.family = "'Nunito Sans',sans-serif";
  Chart.defaults.font.size = 11;
  const mk = (id: string, cfg: ChartConfiguration) => {
    const el = document.getElementById(id) as HTMLCanvasElement | null;
    if (el) charts.push(new Chart(el, cfg));
  };
  const noMaint = { responsive: true, maintainAspectRatio: false };
  // ore settimanali medie per mese (progressione del volume)
  mk('cWkAvg', {
    type: 'line',
    data: {
      labels: D.months.map(mlabel),
      datasets: [
        {
          label: 'ore/sett',
          data: D.avgWkMonth,
          borderColor: '#0EA5E9',
          backgroundColor: 'rgba(14,165,233,.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    },
    options: {
      ...noMaint,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, title: { display: true, text: 'ore / settimana' } },
      },
    },
  });
  // volume mensile (stacked)
  mk('cVol', {
    type: 'bar',
    data: {
      labels: D.months.map(mlabel),
      datasets: D.discs.map((d) => ({
        label: DASH_LBL[d],
        data: D.vol[d].map((x) => +x.toFixed(1)),
        backgroundColor: DASH_COL[d],
      })),
    },
    options: {
      ...noMaint,
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 11, padding: 8 } } },
    },
  });
  // carico settimanale
  mk('cLoad', {
    type: 'bar',
    data: {
      labels: D.weeks.map((w) => w.split('-')[1]),
      datasets: [{ data: D.load, backgroundColor: '#3B82F6', borderRadius: 3 }],
    },
    options: {
      ...noMaint,
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
      plugins: { legend: { display: false } },
    },
  });
  // bilanciamento (doughnut)
  const bd = D.discs.filter((d) => D.tot[d]);
  mk('cBal', {
    type: 'doughnut',
    data: {
      labels: bd.map((d) => DASH_LBL[d]),
      datasets: [
        {
          data: bd.map((d) => +D.tot[d].h.toFixed(1)),
          backgroundColor: bd.map((d) => DASH_COL[d]),
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    },
    options: { ...noMaint, cutout: '58%', plugins: { legend: { position: 'right', labels: { boxWidth: 11, padding: 8 } } } },
  } as ChartConfiguration);
  // zone FC (barre orizzontali)
  mk('cZone', {
    type: 'bar',
    data: {
      labels: ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'],
      datasets: [
        {
          data: [1, 2, 3, 4, 5].map((i) => Math.round(D.z[i])),
          backgroundColor: ['#BFDBFE', '#86EFAC', '#FDE68A', '#FCA5A5', '#EF4444'],
          borderRadius: 3,
        },
      ],
    },
    options: {
      ...noMaint,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, title: { display: true, text: 'minuti' } } },
    },
  });
  // efficienza corsa (passo invertito + FC, doppio asse)
  mk('cEff', {
    type: 'line',
    data: {
      labels: D.rmonths.map(mlabel),
      datasets: [
        {
          type: 'line',
          label: 'Passo (min/km)',
          data: D.pace.map((p) => +p.toFixed(2)),
          borderColor: '#F59E0B',
          backgroundColor: '#F59E0B',
          yAxisID: 'yP',
          tension: 0.3,
          pointRadius: 3,
        },
        {
          type: 'line',
          label: 'FC media',
          data: D.rhr,
          borderColor: '#EF4444',
          backgroundColor: '#EF4444',
          yAxisID: 'yH',
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    },
    options: {
      ...noMaint,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 11, padding: 10 } } },
      scales: {
        yP: {
          position: 'left',
          reverse: true,
          title: { display: true, text: 'passo (su = più veloce)' },
          ticks: { callback: (v) => mmssTick(Number(v)) },
        },
        yH: { position: 'right', title: { display: true, text: 'FC' }, grid: { drawOnChartArea: false } },
      },
    },
  } as ChartConfiguration);
  return charts;
}

/** Altimetria (canvas `cElev`) per il dettaglio attività. Ritorna la Chart creata. */
export function drawElevChart(elev: Array<[number, number]>): Chart | null {
  ensureRegistered();
  const el = document.getElementById('cElev') as HTMLCanvasElement | null;
  if (!el) return null;
  return new Chart(el, {
    type: 'line',
    data: {
      labels: elev.map((p) => p[0]),
      datasets: [
        {
          data: elev.map((p) => p[1]),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245,158,11,.18)',
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: 'km' }, ticks: { maxTicksLimit: 8 } },
        y: { title: { display: true, text: 'm' } },
      },
    },
  });
}
