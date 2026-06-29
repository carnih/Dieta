// Vista ALLENAMENTI — portata FEDELE da renderAllenamentiTab() del monolite index.html.
// Contiene: campo Obiettivo (coachConfig.obiettivo, sticky), "Scheda di oggi",
// progCard(forza) + progCard(tri) con settimane a fisarmonica, e i controlli
// (data inizio, salta, Modifica, PDF). Lo switch verso EDITOR e VIEWER PDF e' gestito
// qui con stato locale. La dashboard e' una prop (onOpenDashboard).
//
// DATI: store via useStore (coachConfig, allenamentiCfg, schedule). Le SCRITTURE passano
// da repo.set. Le schede editabili (`allenamentiSchede`) sono sottoscritte localmente
// (il nodo non e' esposto da useStore) con fallback al default ALLENAMENTI di @/lib.

import { useEffect, useState } from 'react';
import { repo } from '@/data';
import { useStore } from '@/hooks/useStore';
import { todayId } from '@/lib/date';
import {
  ALLENAMENTI,
  DISC,
  alCfg,
  settCorrente,
  trainLabel,
  schedOpt,
  getSchedDays,
} from '@/lib/trainingData';
import type {
  Allenamenti,
  AllenamentiCfg,
  AlProgCfg,
  Blocco,
  Programma,
  Schedule,
  Sessione,
  Week,
} from '@/lib/types';
import PdfViewer from '@/pages/allenamenti/PdfViewer';
import SchedeEditor from '@/pages/allenamenti/SchedeEditor';
import { useAllenamentiStyles } from '@/pages/allenamenti/styles';

type Prog = 'forza' | 'tri';

export interface AllenamentiProps {
  /** Apre la dashboard analitica (gestita altrove). */
  onOpenDashboard: () => void;
  /** Toast applicativo (default: no-op). */
  onToast?: (msg: string) => void;
}

const MSG_SAVED = '✓ Salvato';

// ── helper di rendering (locali, portati dal monolite) ──────────────────────
function blkView(b: Blocco, key: number) {
  return (
    <div key={key} className="al-blk">
      <div className="al-blk-n">{b.nome}</div>
      <div className="al-blk-r">{b.righe}</div>
    </div>
  );
}

function sessView(s: Sessione, key: number) {
  const [em, nm] = DISC[s.disc] || ['•', s.disc];
  const lab = s.nome || nm;
  return (
    <div key={key} className="al-sess">
      <span className={'al-sess-h d-' + s.disc}>
        {em} {lab}
      </span>
      {(s.blocchi || []).map((b, i) => blkView(b, i))}
    </div>
  );
}

// forza: supporta piu' sessioni/settimana (sessioni[]) o singola (blocchi)
function forzaBody(w: Week) {
  const ss: Sessione[] = w.sessioni || [{ disc: 'forza', blocchi: w.blocchi || [] }];
  return ss.map((s, i) => sessView(s, i));
}
function triBody(w: Week) {
  return (
    <>
      {(w.sessioni || []).map((s, i) => sessView(s, i))}
      {w.note && <div className="al-note">🍬 {w.note}</div>}
    </>
  );
}

// sessioni di allenamento del giorno (una o piu'), pronte da mostrare
interface SchedaOggi {
  prog: Prog;
  cap: string;
  sessioni: Sessione[];
}

export default function Allenamenti({ onOpenDashboard, onToast }: AllenamentiProps) {
  useAllenamentiStyles();
  const store = useStore();
  const toast = (m: string) => onToast?.(m);

  const coachConfig = store.coachConfig;
  const schedule = (store.schedule || {}) as Schedule;
  const allenamentiCfg = (store.allenamentiCfg as AllenamentiCfg) || {};

  // Schede editabili: nodo `allenamentiSchede` (sottoscritto qui) con fallback al default.
  const [schede, setSchede] = useState<Allenamenti>(ALLENAMENTI);
  useEffect(() => {
    const unsub = repo.subscribe('allenamentiSchede', (v) => {
      setSchede((v as Allenamenti) || ALLENAMENTI);
    });
    return unsub;
  }, []);

  // viste secondarie
  const [editProg, setEditProg] = useState<Prog | null>(null);
  const [pdfProg, setPdfProg] = useState<Prog | null>(null);
  // fisarmonica settimane (alOpen[prog+i]); default = settimana corrente
  const [alOpen, setAlOpen] = useState<Record<string, boolean>>({});

  // ── EDITOR overlay ──
  if (editProg) {
    return (
      <SchedeEditor
        prog={editProg}
        schede={schede}
        allenamentiCfg={allenamentiCfg}
        onChange={(next, opts) => {
          setSchede(next);
          void repo.set('allenamentiSchede', next);
          if (opts?.toast !== false) toast(MSG_SAVED);
        }}
        onClose={() => {
          setEditProg(null);
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  // ── scritture ──
  const setObiettivo = (v: string) => {
    const t = (v || '').trim();
    void repo.set('coachConfig/obiettivo', t || null);
    toast(MSG_SAVED);
  };
  const saveAlCfg = (prog: Prog, patch: Partial<AlProgCfg>) => {
    const curCfg = alCfg(allenamentiCfg, prog);
    void repo.set('allenamentiCfg/' + prog, { ...curCfg, ...patch });
  };
  const skipWeek = (prog: Prog, delta: number) => {
    const c = alCfg(allenamentiCfg, prog);
    saveAlCfg(prog, { shift: Math.max(0, (c.shift || 0) + delta) });
  };
  const setAlStart = (prog: Prog, v: string) => {
    if (v) saveAlCfg(prog, { start: v });
  };

  // ── scheda di oggi ──
  const t = todayId();
  const tlabel = trainLabel(schedule, t);
  const oggi: SchedaOggi[] = [];
  getSchedDays(schedule, t).forEach((id) => {
    const o = schedOpt(id);
    if (!o.sess) return;
    const [prog, disc] = o.sess as [Prog, string | null];
    const wk = schede[prog].weeks[settCorrente(allenamentiCfg, prog)];
    if (!wk) return;
    if (prog === 'forza') {
      const ss: Sessione[] = wk.sessioni || [{ disc: 'forza', blocchi: wk.blocchi || [] }];
      oggi.push({ prog, cap: schede.forza.nome.split(' · ')[0] + ' · ' + wk.titolo, sessioni: ss });
    } else {
      const s = (wk.sessioni || []).find((x) => x.disc === disc);
      if (s) oggi.push({ prog, cap: schede.tri.nome.split(' · ')[0] + ' · ' + wk.titolo, sessioni: [s] });
    }
  });

  // ── card programma (progCard) ──
  const progCard = (prog: Prog, bodyFn: (w: Week) => React.ReactNode) => {
    const P: Programma = schede[prog];
    const cur = settCorrente(allenamentiCfg, prog);
    const cfg = alCfg(allenamentiCfg, prog);
    const icon = prog === 'forza' ? '🏋️' : '🔱';
    return (
      <div className={'card' + (prog === 'tri' ? ' tri-prog' : '')}>
        <div className="al-prog-h">
          <span className="al-ic">{icon}</span> {P.nome.split(' · ')[0]}
          <span className="al-badge">
            Sett. {cur + 1} / {P.durata}
          </span>
        </div>
        <div className="al-bar">
          <i style={{ width: ((cur + 1) / P.durata) * 100 + '%' }} />
        </div>
        <div className="al-ctrl">
          <label className="al-date">
            📅{' '}
            <input
              type="date"
              value={cfg.start || ''}
              onChange={(e) => setAlStart(prog, e.target.value)}
            />
          </label>
          <button className="al-btn" onClick={() => skipWeek(prog, 1)}>
            ⏭️ Salta
          </button>
          {cfg.shift ? (
            <button className="al-btn" onClick={() => skipWeek(prog, -1)}>
              ↩︎ (-{cfg.shift})
            </button>
          ) : null}
          <button className="al-btn" onClick={() => setEditProg(prog)}>
            ✏️ Modifica
          </button>
          <button className="al-btn" onClick={() => setPdfProg(prog)}>
            📎 PDF
          </button>
        </div>
        {P.obiettivi || P.note ? (
          <div className="al-obj">
            {prog === 'tri' ? '🎯' : '📝'} {P.obiettivi || P.note}
          </div>
        ) : null}
        {P.weeks.map((w, i) => {
          const op = alOpen[prog + i] !== undefined ? alOpen[prog + i] : i === cur;
          return (
            <div key={i} className={'al-wk ' + (i === cur ? 'cur' : '')}>
              <div
                className="al-wk-row"
                onClick={() => setAlOpen((o) => ({ ...o, [prog + i]: !op }))}
              >
                <span className={'al-arrow ' + (op ? 'op' : 'cl')}>▾</span>
                {w.titolo}
                {i === cur && <span className="al-cur">corrente</span>}
              </div>
              {op && <div className="al-wk-body">{bodyFn(w)}</div>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="al-scope">
      <div className="page-title n">Allenamenti</div>
      <div className="vsub">
        <div className="page-sub" style={{ padding: 0 }}>
          🎯{' '}
          <input
            className="obj-in"
            defaultValue={coachConfig.obiettivo || ''}
            placeholder="Imposta obiettivo (es. IM 70.3 Cervia · set)"
            onBlur={(e) => {
              if ((e.target.value || '').trim() !== (coachConfig.obiettivo || '')) {
                setObiettivo(e.target.value);
              }
            }}
          />
        </div>
      </div>

      <button className="dash-cta" onClick={onOpenDashboard}>
        <span className="dash-cta-ic">📊</span>
        <span>
          <b>Vuoi capire come sta andando?</b>
          <small>Analisi e grafici dei tuoi allenamenti</small>
        </span>
        <span className="dash-cta-arr">›</span>
      </button>

      <div className="al-grid">
      <div className="card today-al">
        <div className="al-today-h"><span className="al-ic">📋</span> Scheda di oggi · {tlabel}</div>
        {oggi.length ? (
          oggi.map((g, gi) => (
            <div key={gi} style={{ padding: '10px 15px 4px' }}>
              <div className="al-cur" style={{ display: 'inline-block', margin: '0 0 8px' }}>
                {g.cap}
              </div>
              {g.sessioni.map((s, i) => sessView(s, i))}
            </div>
          ))
        ) : (
          <div style={{ padding: '14px 15px', color: '#9CA3AF', fontSize: 13.5 }}>
            Oggi nessuna scheda ({tlabel}). Imposta gli allenamenti nella tab Nicholas.
          </div>
        )}
      </div>

        <div className="al-progs">
          {progCard('forza', forzaBody)}
          {progCard('tri', triBody)}
        </div>
      </div>

      {pdfProg && (
        <PdfViewer
          prog={pdfProg}
          schede={schede}
          onClose={() => setPdfProg(null)}
          onToast={onToast}
        />
      )}
    </div>
  );
}
