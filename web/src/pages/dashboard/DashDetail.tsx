// Dettaglio per disciplina: card riepilogo + specifiche + grafico ore/mese +
// lista attività (con chip brick che apre la gemella). Porta `renderDashDetail`
// e la parte detail di `drawDashCharts` del monolite.

import { useEffect } from 'react';
import type { Chart } from 'chart.js';
import { esc, mmss } from '@/lib/utils';
import { DISC_MAIN } from '@/pages/dashboard/computeDash';
import { drawDetailChart } from '@/pages/dashboard/charts';
import type { DashData } from '@/pages/dashboard/computeDash';
import type { Activity } from '@/lib/types';

function _n(v: unknown): number {
  const x = parseFloat(String(v));
  return isNaN(x) ? 0 : x;
}

const TITLES: Record<string, string> = {
  corsa: '🏃 Corsa',
  bici: '🚴 Bici',
  nuoto: '🏊 Nuoto',
  padel: '🎾 Padel',
  forza: '🏋️ Forza',
  altri: '🤸 Altri sport',
};

interface Props {
  D: DashData;
  disc: string; // disciplina o 'altri'
  onBack: () => void;
  onOpenActivity: (i: number) => void;
}

export default function DashDetail({ D, disc, onBack, onOpenActivity }: Props) {
  const MAIN = DISC_MAIN;
  const acts: Activity[] =
    disc === 'altri'
      ? D.A.filter((a) => !MAIN.includes(String(a.disciplina)))
      : D.A.filter((a) => a.disciplina === disc);

  // grafico "Ore per mese" (canvas cDet) — disegnato dopo il render
  useEffect(() => {
    if (!acts.length) return;
    const charts: Chart[] = drawDetailChart(D, disc);
    return () => charts.forEach((c) => c.destroy());
  }, [D, disc, acts.length]);

  const back = (
    <div className="dash-head">
      <button className="dash-back" onClick={onBack}>
        ←
      </button>
      <div>
        <div className="dash-title">{TITLES[disc] || disc}</div>
        <div className="dash-sub">{acts.length} attività negli ultimi 8 mesi</div>
      </div>
    </div>
  );

  if (!acts.length) {
    return (
      <div className="dash">
        {back}
        <div className="dash-empty">Nessuna attività</div>
      </div>
    );
  }

  const sum = (f: string) => acts.reduce((s, a) => s + _n(a[f]), 0);
  const avg = (f: string, fil?: (a: Activity) => boolean) => {
    const v = acts.filter((a) => _n(a[f]) > 0 && (!fil || fil(a))).map((a) => _n(a[f]));
    return v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0;
  };
  const h = sum('durata_min') / 60,
    km = sum('distanza_km');
  const fc = avg('fc_media'),
    fcmax = Math.max(...acts.map((a) => _n(a.fc_max)));
  const durM = sum('durata_min') / acts.length;
  const load = sum('carico');
  const longest = acts.reduce((b, a) => (_n(a.distanza_km) > _n(b.distanza_km) ? a : b), acts[0]);
  const longestT = acts.reduce((b, a) => (_n(a.durata_min) > _n(b.durata_min) ? a : b), acts[0]);

  // card statistica (markup come `st()` del monolite)
  const st = (lab: string, val: string | number, sub?: string) =>
    `<div class="dash-card"><div class="dc-val" style="font-size:18px">${val}</div><div class="dc-lab">${lab}</div><div class="dc-sub">${
      sub || ''
    }</div></div>`;

  let spec = '';
  if (disc === 'corsa') {
    const wp = acts.filter((a) => _n(a.distanza_km) > 1 && _n(a.durata_min) > 0);
    const pace = wp.length ? wp.reduce((s, a) => s + _n(a.durata_min) / _n(a.distanza_km), 0) / wp.length : 0;
    const best = wp
      .filter((a) => _n(a.distanza_km) >= 3)
      .reduce(
        (b, a) => (_n(a.durata_min) / _n(a.distanza_km) < _n(b.durata_min) / _n(b.distanza_km) ? a : b),
        wp[0],
      );
    spec =
      st('Passo medio', pace ? mmss(pace) + '/km' : '–', 'su uscite >1 km') +
      st(
        'Miglior passo',
        best ? mmss(_n(best.durata_min) / _n(best.distanza_km)) + '/km' : '–',
        best ? best.data + ' · ' + _n(best.distanza_km).toFixed(1) + ' km' : '',
      ) +
      st('Più lunga', _n(longest.distanza_km).toFixed(1) + ' km', longest.data);
  } else if (disc === 'bici') {
    const wv = acts.filter((a) => _n(a.distanza_km) > 3);
    const vel = wv.length ? wv.reduce((s, a) => s + _n(a.distanza_km) / (_n(a.durata_min) / 60), 0) / wv.length : 0;
    spec =
      st('Velocità media', vel ? vel.toFixed(1) + ' km/h' : '–', 'su uscite >3 km') +
      st('Più lunga', _n(longest.distanza_km).toFixed(0) + ' km', longest.data) +
      st('In sella max', Math.round(_n(longestT.durata_min)) + ' min', longestT.data);
  } else if (disc === 'nuoto') {
    const wn = acts.filter((a) => _n(a.distanza_km) > 0.1);
    const p100 = wn.length ? wn.reduce((s, a) => s + _n(a.durata_min) / (_n(a.distanza_km) * 10), 0) / wn.length : 0;
    spec =
      st('Passo medio', p100 ? mmss(p100) + '/100m' : '–', '') +
      st('Più lunga', (_n(longest.distanza_km) * 1000).toFixed(0) + ' m', longest.data) +
      st('Media/sessione', ((km / acts.length) * 1000).toFixed(0) + ' m', '');
  } else if (disc === 'altri') {
    spec = Object.entries(D.altri.byType)
      .sort((a, b) => b[1].h - a[1].h)
      .map(([lab, o]) => st(lab, o.h.toFixed(1) + 'h', o.n + ' att.'))
      .join('');
  } else {
    spec =
      st('Durata media', Math.round(durM) + ' min', 'a seduta') +
      st('Più lunga', Math.round(_n(longestT.durata_min)) + ' min', longestT.data) +
      st('FC max vista', fcmax > 0 ? Math.round(fcmax) + ' bpm' : '–', '');
  }

  const topCards =
    st('Sedute', acts.length, '') +
    st('Ore', h.toFixed(1), '') +
    (km > 0.5 ? st('Km', km.toFixed(disc === 'nuoto' ? 1 : 0), '') : st('Carico', Math.round(load), 'totale')) +
    st('FC media', fc ? Math.round(fc) + ' bpm' : '–', '') +
    st('Durata media', Math.round(durM) + "'", 'a seduta') +
    st('Carico medio', acts.length ? Math.round(load / acts.length) : '–', 'a seduta');

  return (
    <div className="dash">
      {back}
      <div className="dash-cards" dangerouslySetInnerHTML={{ __html: topCards }} />
      <div className="dash-sec-title">{disc === 'altri' ? 'Sport inclusi' : 'Specifiche'}</div>
      <div className="dash-cards" dangerouslySetInnerHTML={{ __html: spec }} />
      <div className="dash-chart dash-wide">
        <div className="dch-title">📈 Ore per mese</div>
        <div className="dch-canvas">
          <canvas id="cDet" />
        </div>
      </div>
      <div className="dash-sec-title" style={{ marginTop: 12 }}>
        Tutte le attività ({acts.length})
      </div>
      <div className="ddet-list">
        {acts
          .slice()
          .reverse()
          .map((a) => {
            const bk = D.brick[String(a.id)];
            const idx = D.A.indexOf(a);
            return (
              <button key={String(a.id) + idx} className="ddet-row" onClick={() => onOpenActivity(idx)}>
                <span className="ddet-date">{(a.data || '').slice(5)}</span>
                <span className="ddet-name">{a.nome || ''}</span>
                <span className="ddet-meta">
                  {_n(a.distanza_km) > 0 ? _n(a.distanza_km).toFixed(1) + ' km · ' : ''}
                  {Math.round(_n(a.durata_min))}' {_n(a.fc_media) > 0 ? '· ❤️' + Math.round(_n(a.fc_media)) : ''}
                </span>
                {bk && (
                  <span
                    className="ddet-brick"
                    title={`Brick · apri la ${esc(bk.disc)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenActivity(bk.idx);
                    }}
                  >
                    🔥 {bk.disc === 'corsa' ? '🏃' : '🚴'} {bk.km > 0.1 ? bk.km.toFixed(1) + 'km' : bk.min + "'"}
                  </span>
                )}
                <span className="ddet-go">›</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
