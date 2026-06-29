// DASHBOARD allenamenti (analisi + grafici). Porta `renderDashboard` del
// monolite index.html + la navigazione interna (dashboard → dettaglio
// disciplina → dettaglio singola attività, con stati locali al posto delle
// globali dashDetail/actDetail). Dati: store.training.

import { useEffect, useMemo, useState } from 'react';
import type { Chart } from 'chart.js';
import { useStore } from '@/hooks/useStore';
import { computeDash } from '@/pages/dashboard/computeDash';
import { drawDashCharts } from '@/pages/dashboard/charts';
import DashDetail from '@/pages/dashboard/DashDetail';
import ActivityDetail from '@/pages/dashboard/ActivityDetail';
import '@/pages/dashboard/dashboard.css';

interface Props {
  /** Chiusura dashboard (torna alla tab Allenamenti). */
  onClose: () => void;
}

export default function Dashboard({ onClose }: Props) {
  const { training } = useStore();
  const D = useMemo(() => computeDash(training), [training]);

  // navigazione interna (sostituisce le globali dashDetail / actDetail)
  const [dashDetail, setDashDetail] = useState<string | null>(null);
  const [actDetail, setActDetail] = useState<number | null>(null);

  // dettaglio singola attività (ha la sua gestione mappa/chart interna)
  if (actDetail != null) {
    return (
      <ActivityDetail
        D={D}
        index={actDetail}
        onBack={() => setActDetail(null)}
        onOpenActivity={(i) => {
          setActDetail(i);
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  // dettaglio disciplina
  if (dashDetail) {
    return (
      <DashDetail
        D={D}
        disc={dashDetail}
        onBack={() => setDashDetail(null)}
        onOpenActivity={(i) => {
          setActDetail(i);
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  return (
    <DashboardMain
      D={D}
      onClose={onClose}
      onOpenDetail={(d) => {
        setDashDetail(d);
        window.scrollTo(0, 0);
      }}
    />
  );
}

// ── vista principale (renderDashboard del monolite) ──
function DashboardMain({
  D,
  onClose,
  onOpenDetail,
}: {
  D: ReturnType<typeof computeDash>;
  onClose: () => void;
  onOpenDetail: (disc: string) => void;
}) {
  // disegna i 6 grafici dopo che i canvas sono in DOM
  useEffect(() => {
    if (!D.A.length) return;
    const charts: Chart[] = drawDashCharts(D);
    return () => charts.forEach((c) => c.destroy());
  }, [D]);

  const back = (
    <div className="dash-head">
      <button className="dash-back" onClick={onClose}>
        ←
      </button>
      <div>
        <div className="dash-title">Come sta andando</div>
        <div className="dash-sub">verso il 70.3 · Cervia set. 2026</div>
      </div>
    </div>
  );

  if (!D.A.length) {
    return (
      <div className="dash">
        {back}
        <div className="dash-empty">Sto caricando i tuoi dati…</div>
      </div>
    );
  }

  const zt = D.z.reduce((a, b) => a + b, 0) || 1;
  const easy = Math.round(((D.z[1] + D.z[2]) / zt) * 100);
  const padelH = D.tot.padel ? D.tot.padel.h : 0;
  const topDisc = Object.entries(D.tot).sort((a, b) => b[1].h - a[1].h)[0][0];
  const g = (d: string, k: 'n' | 'h' | 'km') => (D.tot[d] ? D.tot[d][k] : 0);
  const triH = g('bici', 'h') + g('corsa', 'h') + g('nuoto', 'h') + g('forza', 'h');

  const card = (
    disc: string | null,
    ic: string,
    lab: string,
    val: string,
    sub?: string,
  ) => (
    <button
      className={'dash-card' + (disc ? ' clickable' : '')}
      onClick={disc ? () => onOpenDetail(disc) : undefined}
    >
      <div className="dc-ic">{ic}</div>
      <div className="dc-val">{val}</div>
      <div className="dc-lab">{lab}</div>
      <div className="dc-sub">{sub || ''}</div>
      {disc && <div className="dc-more">tocca per dettagli ›</div>}
    </button>
  );

  const dAvg = D.avgWkRecent - (D.avgWkPrev ?? 0);

  return (
    <div className="dash">
      {back}
      <div className="dash-sec-title">
        🏊🚴🏃 Preparazione tri <span className="dash-sec-sum">{triH.toFixed(0)}h totali (incl. forza)</span>
      </div>
      <div className="dash-cards">
        {card('bici', '🚴', 'Bici', g('bici', 'h').toFixed(0) + 'h', g('bici', 'km').toFixed(0) + ' km · ' + g('bici', 'n') + ' uscite')}
        {card('corsa', '🏃', 'Corsa', g('corsa', 'h').toFixed(0) + 'h', g('corsa', 'km').toFixed(0) + ' km · ' + g('corsa', 'n') + ' uscite')}
        {card('nuoto', '🏊', 'Nuoto', g('nuoto', 'h').toFixed(0) + 'h', g('nuoto', 'km').toFixed(1) + ' km · ' + g('nuoto', 'n') + ' sessioni')}
        {card('forza', '🏋️', 'Forza', g('forza', 'h').toFixed(0) + 'h', g('forza', 'n') + ' sedute · S&C')}
        {card(null, '📈', 'Fitness', D.ctl != null ? String(D.ctl) : '–', 'forma · CTL')}
        {card(null, '⏱️', 'Totale', D.totH.toFixed(0) + 'h', D.A.length + ' sedute complessive')}
        {card(
          null,
          '📅',
          'Ore/sett',
          D.avgWkRecent.toFixed(1) + 'h',
          (D.avgWkPrev != null ? (dAvg >= 0 ? '↑ +' : '↓ ') + dAvg.toFixed(1) + 'h' : 'media 4 sett') +
            ' · picco ' +
            D.peakWk.toFixed(1) +
            'h',
        )}
      </div>

      <div className="dash-sec-title">
        🎾🏂 Altri sport <span className="dash-sec-sum">{(padelH + D.altri.h).toFixed(0)}h totali</span>
      </div>
      <div className="dash-cards">
        {card('padel', '🎾', 'Padel', padelH.toFixed(0) + 'h', (D.tot.padel ? D.tot.padel.n : 0) + ' partite')}
        {D.altri.n ? card('altri', '🤸', 'Altri', D.altri.h.toFixed(0) + 'h', D.altri.n + ' attività') : null}
      </div>

      <div className="dash-insights">
        <div className="di-title">💡 Lettura rapida</div>
        <ul>
          <li>
            <b>{topDisc === 'padel' ? 'Il padel è lo sport con più ore' : 'Sport con più ore: ' + topDisc}</b> ({padelH.toFixed(0)}h di
            padel) — occhio a quanto toglie a bici/corsa/nuoto verso la gara.
          </li>
          <li>
            <b>Tempo facile (Z1-2): {easy}%</b> — per l'endurance l'ideale è ~80%. Se è basso, le sedute "facili" sono troppo intense (il
            coach le vuole a 6:05–6:20).
          </li>
          <li>
            <b>Fitness (CTL) {D.ctl != null ? D.ctl : '–'}</b> — il carico cronico: se cresce sei in costruzione, se cala stai scaricando
            (o fermo).
          </li>
          <li>
            <b>Volume: {D.avgWkRecent.toFixed(1)} h/sett</b> (media ultime 4 settimane, picco {D.peakWk.toFixed(1)}h
            {D.avgWkPrev != null
              ? ', ' + (dAvg >= 0 ? 'in crescita 📈' : 'in calo 📉') + ' rispetto alle 4 precedenti (' + D.avgWkPrev.toFixed(1) + 'h)'
              : ''}
            ) — per un endurance lungo il volume costante conta più dei singoli allenamenti intensi.
          </li>
        </ul>
      </div>

      <div className="dash-grid">
        <ChartCard title="📅 Ore settimanali medie / mese" id="cWkAvg" wide />
        <ChartCard title="📊 Volume mensile (ore)" id="cVol" />
        <ChartCard title="⚡ Carico settimanale" id="cLoad" />
        <ChartCard title="🥧 Bilanciamento (ore)" id="cBal" />
        <ChartCard title="❤️ Zone FC (minuti)" id="cZone" />
        <ChartCard title="🏃 Efficienza corsa: passo vs FC" id="cEff" wide />
      </div>
    </div>
  );
}

/** Card grafico (come `chartCard()` del monolite). */
function ChartCard({ title, id, wide }: { title: string; id: string; wide?: boolean }) {
  return (
    <div className={'dash-chart' + (wide ? ' dash-wide' : '')}>
      <div className="dch-title">{title}</div>
      <div className="dch-canvas">
        <canvas id={id} />
      </div>
    </div>
  );
}
