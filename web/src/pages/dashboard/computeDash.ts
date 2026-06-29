// Logica DASHBOARD allenamenti, portata FEDELE dal monolite index.html (computeDash).
// Funzione pura: riceve l'array `training` dallo store e restituisce tutti gli
// aggregati usati dalla vista (totali per disciplina, volume mensile, carico
// settimanale, zone FC, CTL, ore/sett media+picco, gruppi Triathlon/Altri, brick).

import type { Activity } from '@/lib/types';

// ── costanti di dashboard (locali: il task tocca solo i propri file) ──
export const DASH_COL: Record<string, string> = {
  corsa: '#F59E0B',
  bici: '#3B82F6',
  nuoto: '#06B6D4',
  forza: '#8B5CF6',
  padel: '#EC4899',
};
export const DISC_MAIN = ['corsa', 'bici', 'nuoto', 'forza', 'padel']; // discipline "tri" (resto = Altri)
export const DASH_LBL: Record<string, string> = {
  corsa: 'Corsa',
  bici: 'Bici',
  nuoto: 'Nuoto',
  forza: 'Forza',
  padel: 'Padel',
};
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

/** Parse numerico tollerante (NaN → 0). Equivalente a `_n()` del monolite. */
function _n(v: unknown): number {
  const x = parseFloat(String(v));
  return isNaN(x) ? 0 : x;
}

/** Etichetta mese compatta es. "giu '26". Equivalente a `_mlabel()` del monolite. */
export function mlabel(m: string | undefined): string {
  const p = (m || '').split('-');
  return (MESI[+p[1] - 1] || '') + " '" + (p[0] || '').slice(2);
}

/** Etichetta disciplina "Altri" da tipo Garmin. Equivalente a `ALTRI_LBL()`. */
export function altriLbl(t: string | undefined): string {
  const map: Record<string, string> = {
    resort_snowboarding: '🏂 Snowboard',
    backcountry_snowboarding: '🏂 Snowboard',
    indoor_cardio: '🤸 Cardio indoor',
    transition_v2: '🔁 Transizioni',
    multi_sport: '🔀 Multisport',
    hiking: '🥾 Trekking',
    walking: '🚶 Camminata',
    snorkeling: '🤿 Snorkeling',
    other: '• Altro',
  };
  return map[t || ''] || '• ' + (t || 'altro').replace(/_/g, ' ');
}

/** Totale per disciplina. */
export interface DiscTot {
  n: number;
  h: number;
  km: number;
}

/** Dato di brick associato (la "gemella" bici↔corsa). */
export interface BrickInfo {
  idx: number;
  disc: 'corsa' | 'bici';
  nome?: string;
  km: number;
  min: number;
}

/** Risultato completo di computeDash (stesse chiavi del monolite). */
export interface DashData {
  A: Activity[];
  discs: string[];
  tot: Record<string, DiscTot>;
  months: string[];
  vol: Record<string, number[]>;
  weeks: string[];
  load: number[];
  z: number[];
  rmonths: string[];
  pace: number[];
  rhr: number[];
  ctl: number | null;
  totH: number;
  altri: { h: number; n: number; km: number; byType: Record<string, { h: number; n: number }> };
  volAltri: number[];
  avgWkMonth: number[];
  avgWkRecent: number;
  avgWkPrev: number | null;
  peakWk: number;
  brick: Record<string, BrickInfo>;
}

export function computeDash(training: Activity[]): DashData {
  const A = Array.isArray(training) ? training : [];
  const discs = DISC_MAIN;
  const tot: Record<string, DiscTot> = {};
  A.forEach((a) => {
    const d = String(a.disciplina);
    (tot[d] = tot[d] || { n: 0, h: 0, km: 0 });
    tot[d].n++;
    tot[d].h += _n(a.durata_min) / 60;
    tot[d].km += _n(a.distanza_km);
  });
  const months = [...new Set(A.map((a) => a.mese))].filter(Boolean).sort() as string[];
  const vol: Record<string, number[]> = {};
  discs.forEach((d) => (vol[d] = months.map(() => 0)));
  A.forEach((a) => {
    if (discs.includes(String(a.disciplina))) {
      const mi = months.indexOf(String(a.mese));
      if (mi >= 0) vol[String(a.disciplina)][mi] += _n(a.durata_min) / 60;
    }
  });
  const wk: Record<string, number> = {};
  A.forEach((a) => {
    if (a.anno_sett) wk[a.anno_sett] = (wk[a.anno_sett] || 0) + _n(a.carico);
  });
  const weeks = Object.keys(wk).sort().slice(-18);
  const load = weeks.map((w) => Math.round(wk[w]));
  // ore settimanali di allenamento (tutte le discipline) e progressione mensile
  const wkH: Record<string, number> = {};
  A.forEach((a) => {
    if (a.anno_sett) wkH[a.anno_sett] = (wkH[a.anno_sett] || 0) + _n(a.durata_min) / 60;
  });
  const hMon: Record<string, number> = {};
  const wkMon: Record<string, Set<string>> = {};
  A.forEach((a) => {
    if (a.mese) {
      hMon[a.mese] = (hMon[a.mese] || 0) + _n(a.durata_min) / 60;
      (wkMon[a.mese] = wkMon[a.mese] || new Set<string>()).add(String(a.anno_sett));
    }
  });
  const avgWkMonth = months.map((m) => {
    const w = wkMon[m] ? wkMon[m].size : 0;
    return w ? +((hMon[m] || 0) / w).toFixed(1) : 0;
  });
  const wkKeys = Object.keys(wkH).sort();
  const fullW = wkKeys.slice(0, -1); // esclude la settimana in corso (parziale)
  const avgH = (arr: string[]) => (arr.length ? arr.reduce((s, w) => s + wkH[w], 0) / arr.length : 0);
  const avgWkRecent = avgH(fullW.slice(-4));
  const avgWkPrev = fullW.length > 4 ? avgH(fullW.slice(-8, -4)) : null;
  const peakWk = fullW.length ? Math.max(...fullW.slice(-12).map((w) => wkH[w])) : 0;
  const z = [0, 0, 0, 0, 0, 0];
  A.forEach((a) => {
    for (let i = 1; i <= 5; i++) z[i] += _n(a['zona' + i + '_min']);
  });
  const rp: Record<string, number[]> = {};
  const rh: Record<string, number[]> = {};
  A.forEach((a) => {
    if (a.disciplina === 'corsa') {
      const di = _n(a.distanza_km),
        du = _n(a.durata_min),
        hr = _n(a.fc_media);
      if (di > 1 && hr > 0) {
        (rp[String(a.mese)] = rp[String(a.mese)] || []).push(du / di);
        (rh[String(a.mese)] = rh[String(a.mese)] || []).push(hr);
      }
    }
  });
  const rmonths = months.filter((m) => rp[m]);
  const pace = rmonths.map((m) => rp[m].reduce((x, y) => x + y, 0) / rp[m].length);
  const rhr = rmonths.map((m) => Math.round(rh[m].reduce((x, y) => x + y, 0) / rh[m].length));
  const ctlv = A.filter((a) => _n(a.ctl) > 0);
  const ctl = ctlv.length ? Math.round(_n(ctlv[ctlv.length - 1].ctl)) : null;
  const totH = Object.values(tot).reduce((s, d) => s + d.h, 0);
  const MAIN = DISC_MAIN;
  const altri = { h: 0, n: 0, km: 0, byType: {} as Record<string, { h: number; n: number }> };
  const volAltri = months.map(() => 0);
  A.forEach((a) => {
    if (!MAIN.includes(String(a.disciplina))) {
      const hh = _n(a.durata_min) / 60;
      altri.h += hh;
      altri.n++;
      altri.km += _n(a.distanza_km);
      const lab = altriLbl(a.tipo_garmin);
      (altri.byType[lab] = altri.byType[lab] || { h: 0, n: 0 });
      altri.byType[lab].h += hh;
      altri.byType[lab].n++;
      const mi = months.indexOf(String(a.mese));
      if (mi >= 0) volAltri[mi] += hh;
    }
  });
  // ── BRICK: bici→corsa stesso giorno con la corsa che parte entro ~35' dalla fine bici ──
  const brick: Record<string, BrickInfo> = {};
  {
    const toMin = (s: unknown): number | null => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ''));
      return m ? +m[1] * 60 + +m[2] : null;
    };
    const byDay: Record<string, Activity[]> = {};
    A.forEach((a) => {
      if (a.data) (byDay[a.data] = byDay[a.data] || []).push(a);
    });
    Object.values(byDay).forEach((day) => {
      const ev = day
        .map((a) => ({ a, st: toMin(a.ora) }))
        .filter((x): x is { a: Activity; st: number } => x.st != null)
        .sort((x, y) => x.st - y.st);
      for (let i = 0; i < ev.length; i++) {
        const b = ev[i].a;
        if (b.disciplina !== 'bici') continue;
        const bEnd = ev[i].st + _n(b.durata_min);
        for (let j = i + 1; j < ev.length; j++) {
          const r = ev[j].a,
            gap = ev[j].st - bEnd;
          if (gap > 35) break;
          if (r.disciplina === 'corsa' && gap >= -10) {
            brick[String(b.id)] = {
              idx: A.indexOf(r),
              disc: 'corsa',
              nome: r.nome,
              km: _n(r.distanza_km),
              min: Math.round(_n(r.durata_min)),
            };
            brick[String(r.id)] = {
              idx: A.indexOf(b),
              disc: 'bici',
              nome: b.nome,
              km: _n(b.distanza_km),
              min: Math.round(_n(b.durata_min)),
            };
            break;
          }
        }
      }
    });
  }
  return {
    A,
    discs,
    tot,
    months,
    vol,
    weeks,
    load,
    z,
    rmonths,
    pace,
    rhr,
    ctl,
    totH,
    altri,
    volAltri,
    avgWkMonth,
    avgWkRecent,
    avgWkPrev,
    peakWk,
    brick,
  };
}
