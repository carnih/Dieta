// EDITOR SCHEDE (forza + tri) — stesso look della vista Allenamenti.
// Persiste sul nodo `allenamentiSchede` via repo.set (gestito dal chiamante tramite
// `onChange`, che salva l'intero oggetto schede come nel monolite `saveSchede`).
// Handlers portati FEDELI da renderSchedeEdit + window.* del monolite, riscritti in
// modo immutabile (deep-clone prima di mutare, poi onChange).

import { useState } from 'react';
import { DISC, settCorrente } from '@/lib/trainingData';
import type { Allenamenti, AllenamentiCfg, Blocco, Sessione, Week } from '@/lib/types';

type Prog = 'forza' | 'tri';
const TRI_DISCS = ['nuoto', 'bici', 'corsa', 'forza', 'brick'] as const;

export interface SchedeEditorProps {
  prog: Prog;
  schede: Allenamenti;
  allenamentiCfg: AllenamentiCfg;
  /** Persiste l'intero oggetto schede (equivalente a saveSchede) + toast. */
  onChange: (next: Allenamenti, opts?: { toast?: boolean }) => void;
  onClose: () => void;
}

// clone profondo via JSON: le schede sono dati semplici (stringhe/array/oggetti).
function clone(s: Allenamenti): Allenamenti {
  return JSON.parse(JSON.stringify(s)) as Allenamenti;
}

export default function SchedeEditor({
  prog,
  schede,
  allenamentiCfg,
  onChange,
  onClose,
}: SchedeEditorProps) {
  const P = schede[prog];
  const isTri = prog === 'tri';
  const cur = settCorrente(allenamentiCfg, prog);

  // Stato "fisarmonica" locale: edOpen[wi] = aperta/chiusa (default = settimana corrente).
  const [edOpen, setEdOpen] = useState<Record<number, boolean>>({});
  const isOpen = (wi: number) => (edOpen[wi] !== undefined ? edOpen[wi] : wi === cur);
  const toggleWk = (wi: number) => setEdOpen((o) => ({ ...o, [wi]: !isOpen(wi) }));

  if (!P) return null;

  // ── mutazioni (clone → muta → onChange) ──────────────────────────────────
  const save = (mut: (al: Allenamenti) => void, toast = true) => {
    const next = clone(schede);
    mut(next);
    onChange(next, { toast });
  };

  const blkArr = (w: Week, si: number): Blocco[] => {
    if (si < 0) {
      if (!w.blocchi) w.blocchi = [];
      return w.blocchi;
    }
    const s = (w.sessioni as Sessione[])[si];
    if (!s.blocchi) s.blocchi = [];
    return s.blocchi;
  };

  const setSchedaTop = (v: string) =>
    save((al) => {
      if (prog === 'tri') al.tri.obiettivi = v;
      else al.forza.note = v;
    });
  const setSchedaTitolo = (wi: number, v: string) =>
    save((al) => {
      al[prog].weeks[wi].titolo = v;
    });
  const setWeekNote = (wi: number, v: string) =>
    save((al) => {
      const t = (v || '').trim();
      if (t) al[prog].weeks[wi].note = t;
      else delete al[prog].weeks[wi].note;
    });
  const setBloccoField = (wi: number, si: number, bi: number, f: keyof Blocco, v: string) =>
    save((al) => {
      blkArr(al[prog].weeks[wi], si)[bi][f] = v;
    });
  const addBlocco = (wi: number, si: number) =>
    save((al) => {
      blkArr(al[prog].weeks[wi], si).push({ nome: '', righe: '' });
    });
  const delBlocco = (wi: number, si: number, bi: number) =>
    save((al) => {
      blkArr(al[prog].weeks[wi], si).splice(bi, 1);
    });
  const setSessDisc = (wi: number, si: number, v: string) =>
    save((al) => {
      (al[prog].weeks[wi].sessioni as Sessione[])[si].disc = v;
    });
  const addSess = (wi: number) =>
    save((al) => {
      const w = al[prog].weeks[wi];
      if (!w.sessioni) w.sessioni = [];
      w.sessioni.push({ disc: 'bici', blocchi: [{ nome: '', righe: '' }] });
    });
  const delSess = (wi: number, si: number) =>
    save((al) => {
      (al[prog].weeks[wi].sessioni as Sessione[]).splice(si, 1);
    });
  const addWeek = () =>
    save((al) => {
      const w: Week =
        prog === 'tri'
          ? { titolo: 'Nuova settimana', sessioni: [{ disc: 'bici', blocchi: [{ nome: '', righe: '' }] }] }
          : { titolo: 'Nuova settimana', blocchi: [{ nome: '', righe: '' }] };
      al[prog].weeks.push(w);
      al[prog].durata = al[prog].weeks.length;
    });
  const delWeek = (wi: number) => {
    if (!confirm('Eliminare questa settimana?')) return;
    save((al) => {
      al[prog].weeks.splice(wi, 1);
      al[prog].durata = al[prog].weeks.length;
    });
  };

  // textarea auto-grow (come nwGrow del monolite)
  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.max(38, el.scrollHeight) + 'px';
  };

  const delBtnStyle: React.CSSProperties = {
    flexShrink: 0,
    border: 'none',
    background: 'transparent',
    color: '#C9D0D9',
    cursor: 'pointer',
    fontSize: 13,
    padding: '2px 4px',
  };

  // ── editor di blocchi (riusato da forza e da ogni sessione tri) ──
  const BlkEditor = ({ wi, si, blocchi }: { wi: number; si: number; blocchi: Blocco[] }) => (
    <>
      {(blocchi || []).map((b, bi) => (
        <div key={bi} className="al-blk" style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              className="sch-name"
              value={b.nome || ''}
              placeholder="NOME BLOCCO (es. Tecnica)"
              onChange={(e) => setBloccoField(wi, si, bi, 'nome', e.target.value)}
            />
            <textarea
              className="ta-auto sch-righe"
              rows={1}
              placeholder="esercizi · serie · note del PT"
              defaultValue={b.righe || ''}
              ref={(el) => el && grow(el)}
              onInput={(e) => grow(e.currentTarget)}
              onBlur={(e) => {
                if (e.target.value !== (b.righe || '')) setBloccoField(wi, si, bi, 'righe', e.target.value);
              }}
            />
          </div>
          <button style={delBtnStyle} onClick={() => delBlocco(wi, si, bi)} title="Elimina blocco">
            🗑
          </button>
        </div>
      ))}
      <button
        className="al-btn"
        style={{ fontSize: 11.5, padding: '5px 11px', marginTop: 2 }}
        onClick={() => addBlocco(wi, si)}
      >
        ＋ blocco
      </button>
    </>
  );

  const top = isTri ? (
    <div className="al-obj">
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: 'var(--n)',
          textTransform: 'uppercase',
          letterSpacing: '.03em',
          marginBottom: 4,
        }}
      >
        🎯 Obiettivi
      </div>
      <textarea
        className="ta-auto"
        rows={2}
        style={topTaStyle}
        placeholder="Obiettivi del mesociclo…"
        defaultValue={P.obiettivi || ''}
        ref={(el) => el && grow(el)}
        onInput={(e) => grow(e.currentTarget)}
        onBlur={(e) => {
          if (e.target.value !== (P.obiettivi || '')) setSchedaTop(e.target.value);
        }}
      />
    </div>
  ) : (
    <div className="al-obj">
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: 'var(--n)',
          textTransform: 'uppercase',
          letterSpacing: '.03em',
          marginBottom: 4,
        }}
      >
        📝 Nota programma
      </div>
      <textarea
        className="ta-auto"
        rows={2}
        style={topTaStyle}
        placeholder="Nota del PT…"
        defaultValue={P.note || ''}
        ref={(el) => el && grow(el)}
        onInput={(e) => grow(e.currentTarget)}
        onBlur={(e) => {
          if (e.target.value !== (P.note || '')) setSchedaTop(e.target.value);
        }}
      />
    </div>
  );

  return (
    <div className="al-scope">
      <div className="dash-head">
        <button className="dash-back" onClick={onClose} aria-label="Indietro">
          ←
        </button>
        <div>
          <div className="page-title n" style={{ padding: 0, position: 'static', margin: 0, boxShadow: 'none' }}>
            ✏️ Modifica scheda
          </div>
          <div className="page-sub" style={{ padding: 0 }}>
            {P.nome} · si salva da solo
          </div>
        </div>
      </div>

      <div className="card">
        <div className="al-prog-h">
          {prog === 'forza' ? '🏋️' : '🔱'} {P.nome.split(' · ')[0]}
          <span className="al-badge">{(P.weeks || []).length} sett.</span>
        </div>
        {top}

        {(P.weeks || []).map((w, wi) => {
          const op = isOpen(wi);
          return (
            <div key={wi} className={'al-wk ' + (wi === cur ? 'cur' : '')}>
              <div className="al-wk-row" style={{ gap: 7 }}>
                <span
                  className={'al-arrow ' + (op ? 'op' : 'cl')}
                  onClick={() => toggleWk(wi)}
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                >
                  ▾
                </span>
                <input
                  className="sch-title"
                  defaultValue={w.titolo || ''}
                  placeholder="Titolo settimana"
                  onBlur={(e) => {
                    if (e.target.value !== (w.titolo || '')) setSchedaTitolo(wi, e.target.value);
                  }}
                />
                {wi === cur && <span className="al-cur">corrente</span>}
                <button style={delBtnStyle} onClick={() => delWeek(wi)} title="Elimina settimana">
                  🗑
                </button>
              </div>
              {op && (
                <div className="al-wk-body">
                  {isTri ? (
                    <>
                      <textarea
                        className="ta-auto al-note"
                        rows={1}
                        style={{ display: 'block', width: '100%', resize: 'none', fontFamily: 'inherit', outline: 'none' }}
                        placeholder="🍬 Nota settimana (opz.)"
                        defaultValue={w.note || ''}
                        ref={(el) => el && grow(el)}
                        onInput={(e) => grow(e.currentTarget)}
                        onBlur={(e) => {
                          if (e.target.value !== (w.note || '')) setWeekNote(wi, e.target.value);
                        }}
                      />
                      {(w.sessioni || []).map((s, si) => (
                        <div key={si} className="al-sess">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                            <select
                              className="al-btn"
                              style={{ padding: '5px 10px', fontSize: 12 }}
                              value={s.disc}
                              onChange={(e) => setSessDisc(wi, si, e.target.value)}
                            >
                              {TRI_DISCS.map((d) => {
                                const dd = DISC[d] || ['•', d];
                                return (
                                  <option key={d} value={d}>
                                    {dd[0]} {dd[1]}
                                  </option>
                                );
                              })}
                            </select>
                            <button style={delBtnStyle} onClick={() => delSess(wi, si)} title="Elimina disciplina">
                              🗑
                            </button>
                          </div>
                          <BlkEditor wi={wi} si={si} blocchi={s.blocchi} />
                        </div>
                      ))}
                      <button
                        className="al-btn"
                        style={{ fontSize: 11.5, padding: '5px 11px', marginTop: 6 }}
                        onClick={() => addSess(wi)}
                      >
                        ＋ disciplina
                      </button>
                    </>
                  ) : (
                    <BlkEditor wi={wi} si={-1} blocchi={w.blocchi || []} />
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ padding: '8px 15px 16px' }}>
          <button className="al-btn" onClick={addWeek}>
            ＋ Aggiungi settimana
          </button>
        </div>
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
}

const topTaStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  border: 'none',
  background: 'transparent',
  resize: 'none',
  fontFamily: 'inherit',
  fontSize: 12.5,
  color: '#3a4a63',
  lineHeight: 1.45,
  outline: 'none',
};
