// Vista OGGI — confronto pasti Noemi/Nicholas del giorno selezionato.
// Portata FEDELE dal monolite index.html (renderOggi + calendarHTML + colonne
// sticky + pasto libero/fuori per persona e data via overrides/{date}/{pasto}/{n|e}).

import { useState } from 'react';
import './oggi/oggi.css';
import { repo } from '@/data';
import { useStore } from '@/hooks/useStore';
import { NOEMI_FULL, todayId, weekDates, fmtFull } from '@/lib/date';
import { isoDate } from '@/lib/utils';
import { NICHOLAS } from '@/lib/dietData';
import {
  ALLENAMENTI,
  getSchedDays,
  getTrain,
  trainLabel,
  schedOpt,
  settCorrente,
} from '@/lib/trainingData';
import type {
  AllenamentiCfg,
  DietDay,
  DietPasto,
  Integ,
  NicholasDiet,
  Schedule,
  WeekdayKey,
} from '@/lib/types';
import { RenderItem, Dash } from '@/pages/oggi/FoodBits';

// ── Props della pagina ──────────────────────────────────────────────────────
// `onOpenScheda` apre il tab Allenamenti (nel monolite era `setTab('allen')`).
interface OggiProps {
  onOpenScheda?: () => void;
}

// ── Narrowing dei nodi store ancora "grezzi" (unknown) ───────────────────────
type NoemiSettimana = Record<string, Record<string, string | undefined> | undefined>;
type OverrideVal = true | { e?: boolean; n?: boolean };
type Overrides = Record<string, Record<string, OverrideVal | undefined> | undefined>;

function asNoemiSettimana(v: unknown): NoemiSettimana {
  return v && typeof v === 'object' ? (v as NoemiSettimana) : {};
}
function asOverrides(v: unknown): Overrides {
  return v && typeof v === 'object' ? (v as Overrides) : {};
}
/** Dieta base di Nicholas: preferisce il nodo store, fallback al default. */
function asNicDiet(v: unknown): NicholasDiet {
  if (v && typeof v === 'object' && Array.isArray((v as NicholasDiet).days)) {
    return v as NicholasDiet;
  }
  return NICHOLAS;
}

// ── Helper locali (fedeli al monolite, non presenti in @/lib) ────────────────

/** Trova un pasto di Nicholas per "tipo" (come `nicMealBy`). */
function nicMealBy(day: DietDay, kind: string): DietPasto | undefined {
  if (kind === 'preall') return day.pasti.find((p) => p.nome === 'Pre-allenamento');
  if (kind === 'colazione') return day.pasti.find((p) => /colazione/i.test(p.nome));
  if (kind === 'spmatt') return day.pasti.find((p) => /spuntino mattina/i.test(p.nome));
  if (kind === 'pranzo') return day.pasti.find((p) => /pranzo/i.test(p.nome));
  if (kind === 'sppom')
    return day.pasti.find((p) => /spuntino pomeriggio|spuntino pre/i.test(p.nome));
  if (kind === 'cena') return day.pasti.find((p) => /cena/i.test(p.nome));
  return undefined;
}

/** Sessioni di allenamento del giorno (come `schedeOggi`, qui solo per il conteggio). */
function schedeOggi(schedule: Schedule, cfg: AllenamentiCfg, wd: WeekdayKey): unknown[] {
  const out: unknown[] = [];
  getSchedDays(schedule, wd).forEach((id) => {
    const o = schedOpt(id);
    if (!o.sess) return;
    const [prog, disc] = o.sess;
    const p = prog as 'forza' | 'tri';
    const wk = ALLENAMENTI[p].weeks[settCorrente(cfg, p)];
    if (!wk) return;
    if (p === 'forza') {
      out.push({ prog: p });
    } else {
      const s = (wk.sessioni || []).find((x) => x.disc === disc);
      if (s) out.push({ prog: p });
    }
  });
  return out;
}

// ── Riga del confronto (modello, come l'array `rows` del monolite) ──
interface CmpRow {
  icon: string;
  title: string;
  e: string | null; // chiave pasto Noemi/override (null = nessun override)
  integ?: Integ;
  n?: DietPasto;
  libero?: string;
}

// ── Colonna Noemi: testo libero dalla settimana (come `noemiSideHTML`) ──
function NoemiSide({
  wd,
  mealKey,
  noemiSettimana,
}: {
  wd: WeekdayKey;
  mealKey: string;
  noemiSettimana: NoemiSettimana;
}) {
  const wkd = noemiSettimana[wd] || {};
  const main = (wkd[mealKey] || '').trim();
  const lines = main ? main.split('\n').filter((l) => l.trim()) : [];
  const dolcetto =
    mealKey === 'cena' ? (wkd.dolcetto || '').trim() : '';
  if (!lines.length && !dolcetto) return <Dash />;
  return (
    <>
      {lines.map((l, i) => (
        <div className="nm-line" key={i}>
          {l.trim()}
        </div>
      ))}
      {dolcetto ? <div className="nm-line dolce">🍫 {dolcetto}</div> : null}
    </>
  );
}

// ── Una colonna (Noemi / Nicholas) di una card ──
function CmpColumn({
  row,
  who,
  on,
  dateKey,
  side,
  onToggle,
}: {
  row: CmpRow;
  who: 'e' | 'n';
  on: boolean;
  dateKey: string | null;
  side: React.ReactNode;
  onToggle: (dateKey: string, meal: string, who: 'e' | 'n') => void;
}) {
  if (row.e && dateKey && on) {
    return (
      <div className="cmp-free" onClick={() => onToggle(dateKey, row.e as string, who)}>
        🍕 Fuori
      </div>
    );
  }
  return (
    <>
      {row.e && dateKey ? (
        <div className="col-freebar">
          <button
            className="col-free"
            onClick={() => onToggle(dateKey, row.e as string, who)}
            title="Pasto libero / fuori"
          >
            🍕
          </button>
        </div>
      ) : null}
      <div className="cmp-items">{side}</div>
    </>
  );
}

// ══════════════════════════════════════════
//  PAGINA
// ══════════════════════════════════════════
export default function Oggi({ onOpenScheda }: OggiProps) {
  const store = useStore();
  const [oggiDay, setOggiDay] = useState<WeekdayKey>(todayId());

  const schedule = store.schedule;
  const cfg = (store.allenamentiCfg ?? {}) as AllenamentiCfg;
  const catLabels = store.catLabels;
  const noemiSettimana = asNoemiSettimana(store.noemiSettimana);
  const overrides = asOverrides(store.overrides);
  const nicDiet = asNicDiet(store.nicBase);

  // togglePastoLibero: scrive overrides/{date}/{meal} = {e?,n?} | null (come monolite)
  const togglePastoLibero = (dateKey: string, meal: string, who: 'e' | 'n') => {
    if (!dateKey || !meal || !who) return;
    const dayOv = overrides[dateKey] || {};
    let cur = dayOv[meal];
    // migra vecchio formato (entrambi)
    let obj: { e?: boolean; n?: boolean } =
      cur === true ? { e: true, n: true } : !cur || typeof cur !== 'object' ? {} : { ...cur };
    const now = !obj[who];
    if (now) obj[who] = true;
    else delete obj[who];
    void repo.set(
      'overrides/' + dateKey + '/' + meal,
      Object.keys(obj).length ? obj : null,
    );
    // niente toast/render manuale: la subscription dello store rirenderizza.
  };

  const wd = oggiDay;
  const isT = wd === todayId();
  const week = weekDates();
  const sel = week.find((x) => x.id === wd);

  const nd: DietDay | undefined =
    nicDiet.days.find((d) => d.id === getTrain(schedule, wd)) ||
    nicDiet.days.find((d) => d.id === 'riposo');

  // header comune (titolo + sub + calendario)
  const calendar = (
    <div className="cal">
      {week.map((d) => {
        const t = todayId();
        return (
          <button
            key={d.id}
            className={`cal-day${oggiDay === d.id ? ' sel' : ''}${d.id === t ? ' today' : ''}`}
            onClick={() => setOggiDay(d.id)}
          >
            <span className="cal-wd">{d.label}</span>
            <span className="cal-dt">{d.num}</span>
          </button>
        );
      })}
    </div>
  );

  if (!nd || !Array.isArray(nd.pasti)) {
    return (
      <div className="oggi">
        <div className="page-title">{isT ? 'Oggi' : NOEMI_FULL[wd]}</div>
        <div className="page-sub">Dati dieta non disponibili</div>
        {calendar}
      </div>
    );
  }

  // costruzione righe (identica all'ordine del monolite)
  const rows: CmpRow[] = [{ icon: '💊', title: 'Integrazione', e: null, integ: nd.integ }];
  const pre = nicMealBy(nd, 'preall');
  if (pre) rows.push({ icon: '⚡', title: 'Pre-allenamento', e: null, n: pre });
  rows.push({ icon: '☀️', title: 'Colazione', e: 'colazione', n: nicMealBy(nd, 'colazione') });
  rows.push({ icon: '🍎', title: 'Spuntino mattina', e: 'spuntino', n: nicMealBy(nd, 'spmatt') });
  rows.push({ icon: '🍽️', title: 'Pranzo', e: 'pranzo', n: nicMealBy(nd, 'pranzo') });
  rows.push({ icon: '🍊', title: 'Spuntino pomeriggio', e: 'merenda', n: nicMealBy(nd, 'sppom') });
  rows.push({ icon: '🌙', title: 'Cena', e: 'cena', n: nicMealBy(nd, 'cena') });
  if (nd.pastoLibero)
    rows.push({ icon: '🍕', title: 'Pasto libero', e: null, libero: nd.pastoLibero });

  const dateKey = sel ? isoDate(sel.obj) : null;
  const dayOv = (dateKey && overrides[dateKey]) || {};

  // colonna Nicholas (lato `n`) per una riga
  const nSideFor = (r: CmpRow): React.ReactNode => {
    if (r.integ !== undefined) return <IntegCompact integ={r.integ} />;
    if (r.n) return r.n.items.map((it, i) => <RenderItem key={i} it={it} catLabels={catLabels} />);
    if (r.libero)
      return (
        <div
          className="extra-item"
          style={{ background: '#FEFCE8', borderColor: '#FDE047', color: '#854D0E' }}
        >
          {r.libero}
        </div>
      );
    return <Dash />;
  };

  const trainTag = trainLabel(schedule, wd);
  const hasScheda = schedeOggi(schedule, cfg, wd).length > 0;

  return (
    <div className="oggi">
      <div className="page-title">{isT ? 'Oggi' : NOEMI_FULL[wd]}</div>
      <div className="page-sub">
        <span className="ps-date">{sel ? fmtFull(sel.obj) : NOEMI_FULL[wd]}</span>
        {trainTag ? <span className="ps-train">{trainTag}</span> : null}
      </div>
      {calendar}

      <div className="cmp-top">
        <div className="cmp-top-col e">
          <span className="ctc-name">🍓 Noemi</span>
        </div>
        <div className="cmp-top-col n">
          <span className="ctc-name">💪 Nicholas</span>
          <div className="ctc-meta">
            <span className="train-tag">{trainTag}</span>
            {hasScheda ? (
              <button className="train-scheda" onClick={() => onOpenScheda?.()}>
                📋 Scheda
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {rows.map((r, idx) => {
        const ov = (r.e && dayOv[r.e]) || {};
        const freeE = ov === true || !!(ov as { e?: boolean }).e;
        const freeN = ov === true || !!(ov as { n?: boolean }).n;
        return (
          <div className="cmp-card" key={idx}>
            <div className="cmp-head">
              <span className="em">{r.icon}</span>
              <span>{r.title}</span>
            </div>
            <div className="cmp-cols">
              <div className="cmp-col">
                <CmpColumn
                  row={r}
                  who="e"
                  on={freeE}
                  dateKey={dateKey}
                  side={
                    r.e ? (
                      <NoemiSide wd={wd} mealKey={r.e} noemiSettimana={noemiSettimana} />
                    ) : (
                      <Dash />
                    )
                  }
                  onToggle={togglePastoLibero}
                />
              </div>
              <div className="cmp-col">
                <CmpColumn
                  row={r}
                  who="n"
                  on={freeN}
                  dateKey={dateKey}
                  side={nSideFor(r)}
                  onToggle={togglePastoLibero}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Integrazione compatta (colonna Nicholas, come `integCompact`) ──
function IntegCompact({ integ }: { integ?: Integ }) {
  if (!integ) return <Dash />;
  if (integ.multi) {
    return (
      <>
        {integ.multi.map((r, i) => (
          <div className="food-row" key={i}>
            <span className="cat-pill integra">{r.tag}</span>
            <span className="food-text">{r.v}</span>
          </div>
        ))}
      </>
    );
  }
  const rowsH: React.ReactNode[] = [];
  if (integ.pre)
    rowsH.push(
      <div className="food-row" key="pre">
        <span className="cat-pill integra">Pre</span>
        <span className="food-text">{integ.pre}</span>
      </div>,
    );
  if (integ.post)
    rowsH.push(
      <div className="food-row" key="post">
        <span className="cat-pill integra">Post</span>
        <span className="food-text">{integ.post}</span>
      </div>,
    );
  if (!rowsH.length) return <Dash />;
  return <>{rowsH}</>;
}
