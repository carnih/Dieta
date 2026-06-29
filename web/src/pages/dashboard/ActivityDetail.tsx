// Dettaglio singola attività: card metriche + banner brick + zone FC + mappa
// Leaflet + profilo altimetrico + salite + lap. Porta `renderActivityDetail`
// e `loadActivityTrack` del monolite (la traccia si legge on-demand da
// training/tracks/{id} via repo.get, mappa con il pacchetto npm 'leaflet').

import { useEffect, useRef } from 'react';
import type { Chart } from 'chart.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { repo } from '@/data';
import { esc, mmss } from '@/lib/utils';
import { altriLbl } from '@/pages/dashboard/computeDash';
import { drawElevChart } from '@/pages/dashboard/charts';
import type { DashData } from '@/pages/dashboard/computeDash';
import type { Activity } from '@/lib/types';

/** Parse numerico tollerante (NaN → 0), come `_n()` del monolite. */
function _n(v: unknown): number {
  const x = parseFloat(String(v));
  return isNaN(x) ? 0 : x;
}

// ── struttura del nodo training/tracks/{id} ──
interface ClimbRow {
  km: number | string;
  len_m: number;
  gain_m: number;
  grad: number;
  gmax?: number | null;
  dur_s?: number;
  hr?: number;
  hrmax?: number;
  cad?: number;
  vam?: number;
  spd?: number;
}
interface LapRow {
  d?: number; // metri
  t?: number; // secondi
  hr?: number;
  cad?: number;
  w?: number;
}
interface TrackRecord {
  v?: number;
  track?: Array<[number, number]>;
  elev?: Array<[number, number]>;
  climbs?: ClimbRow[];
  laps?: LapRow[];
  gain?: number;
}

interface Props {
  D: DashData;
  index: number; // indice in training (D.A)
  onBack: () => void;
  onOpenActivity: (i: number) => void;
}

export default function ActivityDetail({ D, index, onBack, onOpenActivity }: Props) {
  const a: Activity | undefined = D.A[index];
  const mapRef = useRef<HTMLDivElement>(null);
  const elevWrapRef = useRef<HTMLDivElement>(null);
  const climbsRef = useRef<HTMLDivElement>(null);
  const lapsRef = useRef<HTMLDivElement>(null);

  // carica la traccia on-demand e disegna mappa + altimetria + salite + lap
  useEffect(() => {
    let cancelled = false;
    let map: L.Map | null = null;
    let elevChart: Chart | null = null;
    if (!a || !a.id) return;

    (async () => {
      let tr: TrackRecord | null = null;
      try {
        tr = await repo.get<TrackRecord>('training/tracks/' + a.id);
      } catch {
        tr = null;
      }
      if (cancelled) return;
      const mapEl = mapRef.current;
      if (!mapEl) return;
      if (!tr || !Array.isArray(tr.track) || tr.track.length < 2) {
        mapEl.style.display = 'none';
        // niente traccia: provo comunque a mostrare eventuali lap/salite? Nel
        // monolite no (richiede track per arrivare qui), quindi mi fermo.
      } else {
        // mappa Leaflet
        try {
          map = L.map(mapEl);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '© OpenStreetMap',
          }).addTo(map);
          const line = L.polyline(tr.track, { color: '#EF4444', weight: 4 }).addTo(map);
          map.fitBounds(line.getBounds(), { padding: [18, 18] });
          setTimeout(() => {
            try {
              map?.invalidateSize();
            } catch {
              /* noop */
            }
          }, 150);
        } catch {
          mapEl.innerHTML = '<div class="dash-empty" style="padding:20px">Mappa non disponibile</div>';
        }
      }

      // profilo altimetrico
      const ew = elevWrapRef.current;
      if (ew && tr && Array.isArray(tr.elev) && tr.elev.length > 1) {
        ew.innerHTML = chartCardHtml('📈 Altimetria' + (tr.gain ? ' · +' + tr.gain + ' m' : ''), 'cElev', 'dash-wide');
        elevChart = drawElevChart(tr.elev);
      }

      // salite
      const cw = climbsRef.current;
      if (cw && tr && Array.isArray(tr.climbs) && tr.climbs.length) {
        cw.innerHTML =
          '<div class="dash-sec-title" style="margin-top:12px">🧗 Salite (' +
          tr.climbs.length +
          ')</div>' +
          '<div class="ddet-list">' +
          tr.climbs
            .map((c) => {
              const ss = c.dur_s || 0;
              const t = ss ? Math.floor(ss / 60) + ':' + String(ss % 60).padStart(2, '0') : '';
              const sub = [
                t ? '⏱ ' + t : '',
                c.hr ? '❤️ ' + c.hr + (c.hrmax ? '/' + c.hrmax : '') : '',
                c.cad ? '🔄 ' + c.cad : '',
                c.vam ? 'VAM ' + c.vam : '',
                c.spd ? c.spd + ' km/h' : '',
              ]
                .filter(Boolean)
                .join('  ·  ');
              return (
                '<div class="climb-row"><div class="climb-l"><div class="climb-top">km ' +
                c.km +
                ' · ' +
                (c.len_m / 1000).toFixed(1) +
                ' km · +' +
                c.gain_m +
                ' m</div>' +
                (sub ? `<div class="climb-sub">${sub}</div>` : '') +
                '</div><div class="climb-grad">' +
                c.grad +
                '%<small>max ' +
                (c.gmax != null ? c.gmax : c.grad) +
                '%</small></div></div>'
              );
            })
            .join('') +
          '</div>';
      }

      // lap (corsa / bici / nuoto)
      const lw = lapsRef.current;
      if (lw && tr && Array.isArray(tr.laps) && tr.laps.length) {
        const d = a.disciplina;
        const rows = tr.laps
          .map((lap, i) => {
            const km = (lap.d || 0) / 1000,
              t = lap.t || 0;
            let main: string;
            if (d === 'corsa')
              main = km.toFixed(2) + ' km · ' + (lap.d && lap.d > 0 && t > 0 ? mmss(t / (lap.d / 1000) / 60) + '/km' : '–');
            else if (d === 'bici') main = km.toFixed(1) + ' km · ' + (t > 0 ? (km / (t / 3600)).toFixed(1) + ' km/h' : '–');
            else if (d === 'nuoto')
              main = Math.round(lap.d || 0) + ' m · ' + (lap.d && lap.d > 0 && t > 0 ? mmss(t / (lap.d / 100) / 60) + '/100m' : '–');
            else main = (lap.d && lap.d > 0 ? km.toFixed(2) + ' km · ' : '') + mmss(t / 60);
            const extra = [
              '⏱ ' + mmss(t / 60),
              lap.hr ? '❤️ ' + lap.hr : '',
              lap.cad ? '🔄 ' + lap.cad : '',
              d === 'bici' && lap.w ? lap.w + ' W' : '',
            ]
              .filter(Boolean)
              .join('  ·  ');
            return `<div class="lap-row"><span class="lap-n">${i + 1}</span><div class="lap-l"><div class="lap-top">${main}</div><div class="lap-sub">${extra}</div></div></div>`;
          })
          .join('');
        lw.innerHTML =
          '<div class="dash-sec-title" style="margin-top:12px">⏱ Lap (' +
          tr.laps.length +
          ')</div><div class="ddet-list">' +
          rows +
          '</div>';
      }
    })();

    return () => {
      cancelled = true;
      try {
        elevChart?.destroy();
      } catch {
        /* noop */
      }
      try {
        map?.remove();
      } catch {
        /* noop */
      }
    };
  }, [a, index]);

  const lbl =
    ({ corsa: '🏃 Corsa', bici: '🚴 Bici', nuoto: '🏊 Nuoto', padel: '🎾 Padel', forza: '🏋️ Forza' } as Record<string, string>)[
      (a && a.disciplina) || ''
    ] || (a ? altriLbl(a.tipo_garmin) : '');

  const back = (
    <div className="dash-head">
      <button className="dash-back" onClick={onBack}>
        ←
      </button>
      <div>
        <div className="dash-title" style={{ fontSize: 22 }}>
          {(a && a.nome) || 'Attività'}
        </div>
        <div className="dash-sub">{a ? (a.data || '') + ' · ' + (a.ora || '') + ' · ' + lbl : ''}</div>
      </div>
    </div>
  );

  if (!a) {
    return (
      <div className="dash">
        {back}
        <div className="dash-empty">Attività non trovata</div>
      </div>
    );
  }

  // card metriche (solo quelle valorizzate, come `sv()` del monolite)
  const sv = (lab: string, val: string | number | undefined, sub?: string) =>
    val
      ? `<div class="dash-card"><div class="dc-val" style="font-size:17px">${val}</div><div class="dc-lab">${lab}</div>${
          sub ? `<div class="dc-sub">${sub}</div>` : ''
        }</div>`
      : '';
  const speed = a.passo_corsa_min_km
    ? sv('Passo', a.passo_corsa_min_km + '/km')
    : a.velocita_bici_kmh
      ? sv('Velocità', a.velocita_bici_kmh + ' km/h')
      : a.passo_nuoto_min_100m
        ? sv('Passo', a.passo_nuoto_min_100m + '/100m')
        : '';
  const cardsHtml = [
    sv('Durata', a.durata_min ? Math.round(a.durata_min) + ' min' : ''),
    _n(a.distanza_km) > 0 ? sv('Distanza', _n(a.distanza_km).toFixed(2) + ' km') : '',
    speed,
    a.fc_media ? sv('FC media', a.fc_media + ' bpm', a.fc_max ? 'max ' + a.fc_max : '') : '',
    a.carico ? sv('Carico', a.carico) : '',
    a.ctl ? sv('Fitness', a.ctl, 'CTL') : '',
    _n(a.disliv_m) > 0 ? sv('Dislivello', a.disliv_m + ' m') : '',
    a.potenza_media_w ? sv('Potenza', a.potenza_media_w + ' W') : '',
    a.cadenza_corsa_spm ? sv('Cadenza', a.cadenza_corsa_spm + ' spm') : '',
    a.calorie ? sv('Calorie', a.calorie + ' kcal') : '',
    a.rpe || a.feel
      ? sv('Sensazione', ((a.rpe ? 'RPE ' + a.rpe : '') + (a.feel ? (a.rpe ? ' · ' : '') + a.feel : '')) || '–')
      : '',
  ].join('');

  // zone FC
  const zmin = [1, 2, 3, 4, 5].map((i) => _n(a['zona' + i + '_min']));
  const ztot = zmin.reduce((x, y) => x + y, 0);
  const ZCOL = ['#94A3B8', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
  const zbarHtml =
    ztot > 1
      ? `<div class="dash-sec-title" style="margin-top:8px">Minuti per zona FC</div>` +
        `<div class="zbar">${zmin
          .map((m, i) => (m > 0 ? `<div class="zseg" style="flex:${m};background:${ZCOL[i]}"></div>` : ''))
          .join('')}</div>` +
        `<div class="zleg">${zmin
          .map((m, i) => (m > 0 ? `<span><i style="background:${ZCOL[i]}"></i>Z${i + 1} ${Math.round(m)}'</span>` : ''))
          .join('')}</div>`
      : '';

  const bk = D && D.brick && D.brick[String(a.id)];

  return (
    <div className="dash">
      {back}
      {bk && (
        <button className="brick-banner" onClick={() => onOpenActivity(bk.idx)}>
          🔥 <b>Brick</b> — {a.disciplina === 'bici' ? 'seguita dalla corsa' : 'preceduta dalla bici'}:{' '}
          {bk.disc === 'corsa' ? '🏃' : '🚴'} {esc(bk.nome || '')} {bk.km > 0.1 ? '· ' + bk.km.toFixed(1) + ' km' : ''} · {bk.min}
          ' <span style={{ marginLeft: 'auto' }}>›</span>
        </button>
      )}
      <div className="dash-cards" dangerouslySetInnerHTML={{ __html: cardsHtml }} />
      {zbarHtml && <div dangerouslySetInnerHTML={{ __html: zbarHtml }} />}
      {a.id ? (
        <>
          <div id="actMap" ref={mapRef} className="act-map" />
          <div id="actElevWrap" ref={elevWrapRef} />
          <div id="actClimbs" ref={climbsRef} />
          <div id="actLaps" ref={lapsRef} />
        </>
      ) : null}
    </div>
  );
}

/** Markup di una card grafico (come `chartCard()` del monolite). */
function chartCardHtml(title: string, id: string, cls?: string): string {
  return `<div class="dash-chart ${cls || ''}"><div class="dch-title">${title}</div><div class="dch-canvas"><canvas id="${id}"></canvas></div></div>`;
}
