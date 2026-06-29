// Pagina NOEMI — portata FEDELE dal monolite index.html:
//  • renderNoemiTab        → settimana a scrittura libera (textarea per pasto, save via repo.set)
//  • renderNoemiBaseConsult → consultazione dieta base (sola lettura) + bottone Modifica
//  • renderNoemiBaseEdit    → editor dieta base (slot/opzioni del nutrizionista)
// Path di scrittura identici al monolite: noemiSettimana/<wd>/<mk>, noemiBase, catLabels/<cat>.

import { useState } from 'react';
import { repo } from '@/data';
import { useStore } from '@/hooks/useStore';
import {
  NOEMI_BASE as NOEMI_BASE_DEF,
  NOEMI_MEALS,
  NOEMI_PAGE_MEALS,
  NOEMI_NOTES,
  NOEMI_REF,
} from '@/lib/dietData';
import { NOEMI_DAYS, NOEMI_FULL } from '@/lib/date';
import type { CategoriaKey, NoemiBase, WeekdayKey } from '@/lib/types';
import { CatEditor, CatPill, catOptionEls } from '@/pages/dieta/diet';

// Settimana libera: nodo `noemiSettimana` = { <wd>: { <mealKey>: testo } }.
type NoemiSettimana = Partial<Record<WeekdayKey, Record<string, string>>>;

function useNoemiBase(): NoemiBase {
  const { noemiBase } = useStore();
  return (noemiBase as NoemiBase | null) ?? NOEMI_BASE_DEF;
}
function useNoemiSettimana(): NoemiSettimana {
  const { noemiSettimana } = useStore();
  return (noemiSettimana as NoemiSettimana | null) ?? {};
}

type View = 'week' | 'consult' | 'edit';

export default function Noemi() {
  const [view, setView] = useState<View>('week');
  const { catLabels } = useStore();
  const base = useNoemiBase();

  if (view === 'edit') {
    return <NoemiBaseEdit base={base} catLabels={catLabels} onClose={() => goto(setView, 'week')} />;
  }
  if (view === 'consult') {
    return (
      <NoemiBaseConsult
        base={base}
        catLabels={catLabels}
        onBack={() => goto(setView, 'week')}
        onEdit={() => goto(setView, 'edit')}
      />
    );
  }
  return <NoemiWeek onOpenBase={() => goto(setView, 'consult')} />;
}

function goto(setView: (v: View) => void, v: View) {
  setView(v);
  window.scrollTo(0, 0);
}

// ──────────────────────────────────────────────────────────────────────────
//  Settimana a scrittura libera (renderNoemiTab)
// ──────────────────────────────────────────────────────────────────────────
function NoemiWeek({ onOpenBase }: { onOpenBase: () => void }) {
  const settimana = useNoemiSettimana();
  const [open, setOpen] = useState<Partial<Record<WeekdayKey, boolean>>>({});

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 bg-bg px-4.5 py-2 text-[28px] font-extrabold tracking-tight">
        <span style={{ color: 'var(--e)' }}>Noemi</span>
      </div>
      <div
        className="sticky z-[9] -mx-4 flex flex-col gap-2 bg-bg px-4 py-2"
        style={{ top: 'calc(env(safe-area-inset-top,0px) + 48px)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted">
            📝 Scrivi la settimana a mano, come sulle note — una volta al mese
          </div>
          <button
            type="button"
            onClick={onOpenBase}
            className="shrink-0 rounded-full bg-card px-3 py-1.5 text-sm font-semibold shadow-sm"
            style={{ color: 'var(--e)' }}
          >
            📖 Dieta base
          </button>
        </div>
      </div>

      <div className="mt-3">
        {NOEMI_DAYS.map((wd) => {
          const isOpen = open[wd] !== false; // default aperto
          return (
            <div key={wd} className="mb-2 overflow-hidden rounded-card bg-card shadow-sm">
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [wd]: !(o[wd] !== false) }))}
                className="flex w-full items-center gap-2 px-4 py-3 text-left"
              >
                <span
                  className="text-muted transition-transform"
                  style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                >
                  ▾
                </span>
                <span className="font-bold text-ink">{NOEMI_FULL[wd]}</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-3">
                  {NOEMI_PAGE_MEALS.map(([mk, em, lab]) => (
                    <MealTextarea
                      key={mk}
                      wd={wd}
                      mk={mk}
                      emoji={em}
                      label={lab}
                      initial={(settimana[wd] || {})[mk] || ''}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MealTextarea({
  wd,
  mk,
  emoji,
  label,
  initial,
}: {
  wd: WeekdayKey;
  mk: string;
  emoji: string;
  label: string;
  initial: string;
}) {
  // `defaultValue` + onBlur (= onchange del monolite): non rimonta mentre scrivi
  // e quindi il real-time non sovrascrive il testo in corso (come la guard nw-ta).
  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.max(38, el.scrollHeight) + 'px';
  };
  const save = (raw: string) => {
    const v = raw.replace(/\s+$/, '');
    void repo.set('noemiSettimana/' + wd + '/' + mk, v || null);
  };
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <span>{emoji}</span>
        {label}
      </div>
      <textarea
        className="w-full resize-none rounded-lg border border-line px-2.5 py-2 text-sm leading-snug"
        rows={1}
        placeholder="…"
        defaultValue={initial}
        ref={(el) => {
          if (el) grow(el);
        }}
        onInput={(e) => grow(e.currentTarget)}
        onBlur={(e) => save(e.currentTarget.value)}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Promemoria + alimenti ammessi (riuso fra consult ed edit)
// ──────────────────────────────────────────────────────────────────────────
function NotesAndRef() {
  return (
    <>
      <div className="mt-2.5 text-base font-bold" style={{ color: 'var(--e)' }}>
        📋 Promemoria settimana
      </div>
      <div className="rounded-card bg-card p-3.5 shadow-sm">
        {NOEMI_NOTES.map((n, i) => (
          <div key={i} className="py-1 text-sm text-ink">
            {n}
          </div>
        ))}
      </div>
      <div className="mt-1.5 text-base font-bold" style={{ color: 'var(--e)' }}>
        🔎 Alimenti ammessi
      </div>
      <div className="rounded-card bg-card p-3.5 shadow-sm">
        {NOEMI_REF.map(([t, d], i) => (
          <div key={i} className="py-1 text-sm text-ink">
            <b>{t}</b> {d}
          </div>
        ))}
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Consultazione dieta base (renderNoemiBaseConsult)
// ──────────────────────────────────────────────────────────────────────────
function NoemiBaseConsult({
  base,
  catLabels,
  onBack,
  onEdit,
}: {
  base: NoemiBase;
  catLabels: Record<string, string>;
  onBack: () => void;
  onEdit: () => void;
}) {
  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 bg-bg px-4.5 py-2 text-[28px] font-extrabold tracking-tight">
        <span style={{ color: 'var(--e)' }}>Dieta base · Noemi</span>
      </div>
      <div className="mb-1 text-sm text-muted">Le opzioni del nutrizionista</div>
      <div className="mb-2 mt-0.5 flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full px-3 py-1.5 text-sm font-bold text-white"
          style={{ background: 'var(--e)' }}
        >
          ← Indietro
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full bg-card px-3 py-1.5 text-sm font-semibold shadow-sm"
          style={{ color: 'var(--e)' }}
        >
          ✏️ Modifica
        </button>
      </div>

      {NOEMI_MEALS.map((mk) => {
        const m = base[mk];
        if (!m || !Array.isArray(m.slots)) return null;
        return (
          <div key={mk} className="mb-3 rounded-card bg-card px-3.5 py-3.5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">{m.icon}</span>
              <span className="font-bold text-ink">{m.nome}</span>
            </div>
            {m.slots.map((s, si) => (
              <div key={si} className="mb-2.5">
                <div className="mb-1 flex items-center gap-2">
                  <CatPill cat={s.cat} catLabels={catLabels} />
                  <b className="text-sm text-ink">{s.label}</b>
                </div>
                {s.opts.map((o, oi) => (
                  <div key={oi} className="py-0.5 pl-1 text-sm text-ink">
                    {o}
                  </div>
                ))}
              </div>
            ))}
            {(m.fixed || []).map((f, fi) => (
              <div key={fi} className="py-0.5 text-sm font-semibold text-muted">
                + {f.v}
              </div>
            ))}
          </div>
        );
      })}

      <NotesAndRef />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Editor dieta base (renderNoemiBaseEdit + azioni beNoemi*)
// ──────────────────────────────────────────────────────────────────────────
function NoemiBaseEdit({
  base,
  catLabels,
  onClose,
}: {
  base: NoemiBase;
  catLabels: Record<string, string>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<NoemiBase>(() => structuredClone(base));

  const save = (next: NoemiBase) => {
    setDraft(next);
    void repo.set('noemiBase', next);
  };
  const mutate = (fn: (b: NoemiBase) => void) => {
    const next = structuredClone(draft);
    fn(next);
    save(next);
  };
  const setCatLabel = (cat: CategoriaKey, value: string) => {
    const v = value.trim();
    void repo.set('catLabels/' + cat, v || null);
  };

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 bg-bg px-4.5 py-2 text-[28px] font-extrabold tracking-tight">
        <span style={{ color: 'var(--e)' }}>Dieta base · Noemi</span>
      </div>
      <div className="mb-1 text-sm text-muted">Opzioni del nutrizionista — consulta e modifica</div>
      <button
        type="button"
        onClick={onClose}
        className="mb-2 rounded-full px-3 py-1.5 text-sm font-bold text-white"
        style={{ background: 'var(--e)' }}
      >
        ✓ Fatto
      </button>

      <div className="rounded-card bg-card px-3.5 pb-2 pt-4 shadow-sm">
        {NOEMI_MEALS.map((mk) => {
          const m = draft[mk];
          if (!m || !Array.isArray(m.slots)) return null;
          return (
            <div key={mk} className="mb-4">
              <div className="mb-2 flex items-center gap-2 font-bold text-ink">
                <span className="text-lg">{m.icon}</span>
                {m.nome}
              </div>
              {m.slots.map((s, si) => (
                <div key={si} className="mb-3 rounded-xl border border-line p-2.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-lg border border-line px-2.5 py-1.5 text-sm font-semibold"
                      placeholder="Nome"
                      defaultValue={s.label}
                      onChange={(e) =>
                        mutate((b) => {
                          b[mk].slots[si].label = e.target.value.trim() || 'Voce';
                        })
                      }
                    />
                    <select
                      className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
                      value={s.cat}
                      onChange={(e) =>
                        mutate((b) => {
                          b[mk].slots[si].cat = e.target.value as CategoriaKey;
                        })
                      }
                    >
                      {catOptionEls()}
                    </select>
                    <button
                      type="button"
                      title="Elimina categoria"
                      className="text-base text-red-500"
                      onClick={() => {
                        if (!confirm('Eliminare questa categoria dal pasto?')) return;
                        mutate((b) => {
                          b[mk].slots.splice(si, 1);
                        });
                      }}
                    >
                      🗑
                    </button>
                  </div>
                  {s.opts.map((o, oi) => (
                    <div key={oi} className="mb-1 flex items-center gap-1.5">
                      <input
                        className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-sm"
                        defaultValue={o}
                        onChange={(e) =>
                          mutate((b) => {
                            b[mk].slots[si].opts[oi] = e.target.value;
                          })
                        }
                      />
                      <button
                        type="button"
                        title="Rimuovi opzione"
                        className="text-muted"
                        onClick={() =>
                          mutate((b) => {
                            const a = b[mk].slots[si].opts;
                            a.splice(oi, 1);
                            if (!a.length) a.push('');
                          })
                        }
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      mutate((b) => {
                        b[mk].slots[si].opts.push('nuova opzione');
                      })
                    }
                    className="rounded-lg border border-dashed border-line px-2.5 py-1 text-xs font-semibold text-muted"
                  >
                    + opzione
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  mutate((b) => {
                    b[mk].slots.push({
                      key: 'cust_' + Date.now(),
                      cat: 'verdura',
                      label: 'Nuova',
                      opts: ['nuova opzione'],
                    });
                  })
                }
                className="mt-1 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs font-semibold text-muted"
              >
                + aggiungi categoria
              </button>
            </div>
          );
        })}
      </div>

      <CatEditor catLabels={catLabels} onChange={setCatLabel} />

      <NotesAndRef />
    </div>
  );
}
