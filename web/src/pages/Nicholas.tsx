// Pagina NICHOLAS — portata FEDELE dal monolite index.html:
//  • renderNicholasTab  → pianificazione settimana (schedule) + chip disciplina + dieta del giorno
//  • renderNicholasDay   → resa dieta del giorno (via NicholasDayView in dieta/diet)
//  • renderNicBaseEdit   → editor dieta base di Nicholas
// Le scritture passano da repo.set (path/val identici al monolite); le letture
// real-time arrivano dallo store. La chip disciplina e' "sticky" come nell'originale.

import { useState } from 'react';
import { repo } from '@/data';
import { useStore } from '@/hooks/useStore';
import { NICHOLAS as NICHOLAS_DEF } from '@/lib/dietData';
import { NOEMI_DAYS, NOEMI_LABELS, todayId } from '@/lib/date';
import { SCHED_OPTS, schedOpt, getSchedDays } from '@/lib/trainingData';
import type {
  CategoriaKey,
  DietDay,
  DietItem,
  NicholasDiet,
  Schedule,
  WeekdayKey,
} from '@/lib/types';
import {
  CatEditor,
  ChipRow,
  NicholasDayView,
  catOptionEls,
} from '@/pages/dieta/diet';

const MSG_SAVED = '✓ Salvato';

// Lo store espone nicBase come `unknown`: fallback al default hardcoded.
function useNicBase(): NicholasDiet {
  const { nicBase } = useStore();
  return (nicBase as NicholasDiet | null) ?? NICHOLAS_DEF;
}

export default function Nicholas() {
  const { schedule, catLabels } = useStore();
  const nic = useNicBase();

  const [nicType, setNicType] = useState<string>('corsa');
  const [editBase, setEditBase] = useState(false);

  if (editBase) {
    return <NicBaseEdit nic={nic} catLabels={catLabels} onClose={() => setEditBase(false)} />;
  }

  const d = nic.days.find((x) => x.id === nicType) ?? nic.days[0];

  return (
    <div>
      <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 bg-bg px-[18px] pb-1.5 pt-2 text-[32px] font-round tracking-tight text-ink">
        <span style={{ color: 'var(--n)' }}>Nicholas</span>
      </div>
      <div className="mb-4 px-0.5 text-sm font-semibold text-[#4b5563]">
        La tua settimana e la tua dieta
      </div>

      <div className="mb-2 mt-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-nic-light text-base">📅</span>
        <span className="font-round text-[15px]" style={{ color: 'var(--n)' }}>
          Pianifica la settimana
        </span>
      </div>
      <Schedule schedule={schedule} />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={resetNicWeek}
          className="rounded-full bg-card px-3.5 py-1.5 text-sm font-semibold text-ink shadow-soft transition-transform duration-200 hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-none"
        >
          ↺ Reset
        </button>
        <button
          type="button"
          onClick={() => {
            setEditBase(true);
            window.scrollTo(0, 0);
          }}
          className="rounded-full bg-card px-3.5 py-1.5 text-sm font-semibold text-ink shadow-soft transition-transform duration-200 hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-none"
        >
          ⚙︎ Modifica dieta base
        </button>
      </div>

      {/* barra controlli sticky sotto il titolo */}
      <div
        className="sticky z-[9] -mx-4 mt-3 flex flex-col gap-2 bg-bg px-4 py-2"
        style={{ top: 'calc(env(safe-area-inset-top,0px) + 48px)' }}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-nic-light text-base">🍽️</span>
          <span className="font-round text-[15px]" style={{ color: 'var(--n)' }}>
            La tua dieta
          </span>
        </div>
        <ChipRow
          items={nic.days.map((x) => ({ id: x.id, label: x.label }))}
          sel={nicType}
          onSelect={setNicType}
          color="n"
        />
      </div>

      <div className="mt-3">
        <NicholasDayView day={d} catLabels={catLabels} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Pianificazione settimana (sched) — select 1ª + chip/“+”/select 2ª attività
// ──────────────────────────────────────────────────────────────────────────
function Schedule({ schedule }: { schedule: Schedule }) {
  const [sched2Open, setSched2Open] = useState<Partial<Record<WeekdayKey, boolean>>>({});
  const t = todayId();

  return (
    <div className="overflow-hidden rounded-card bg-card shadow-soft">
      {NOEMI_DAYS.map((wd) => {
        const days = getSchedDays(schedule, wd);
        const p = days[0] || 'riposo';
        const s2 = days[1] || '';
        const isToday = wd === t;
        return (
          <div
            key={wd}
            className={
              'flex items-center gap-2.5 border-b border-line px-4 py-2.5 last:border-b-0' +
              (isToday ? ' border-l-[3px] border-l-nic bg-nic-light/40' : '')
            }
          >
            <span
              className={
                'w-11 flex-shrink-0 text-sm font-extrabold ' + (isToday ? 'text-nic' : 'text-ink')
              }
            >
              {NOEMI_LABELS[wd]}
              {isToday ? ' ·' : ''}
            </span>
            <div className="min-w-0 flex-1">
              <select
                className="w-full rounded-xl border border-line bg-white px-2.5 py-1.5 text-sm"
                value={p}
                onChange={(e) => setSchedDay(schedule, wd, 0, e.target.value, setSched2Open)}
              >
                {SCHED_OPTS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {p !== 'riposo' &&
              (s2 ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-nic-light px-2.5 py-1 text-xs font-bold text-nic">
                  {schedOpt(s2).label}
                  <button
                    type="button"
                    title="Rimuovi"
                    onClick={() => setSchedDay(schedule, wd, 1, '', setSched2Open)}
                    className="text-nic"
                  >
                    ✕
                  </button>
                </span>
              ) : sched2Open[wd] ? (
                <select
                  className="shrink-0 rounded-xl border border-line bg-white px-2.5 py-1.5 text-sm"
                  defaultValue=""
                  onChange={(e) => setSchedDay(schedule, wd, 1, e.target.value, setSched2Open)}
                >
                  <option value="">scegli…</option>
                  {SCHED_OPTS.filter((o) => o.id !== 'riposo' && o.id !== p).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  title="Aggiungi 2° allenamento"
                  onClick={() => setSched2Open((s) => ({ ...s, [wd]: true }))}
                  className="shrink-0 rounded-full bg-nic-light px-2.5 py-1 text-sm font-bold text-nic transition-transform duration-200 hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-none"
                >
                  ＋
                </button>
              ))}
          </div>
        );
      })}
    </div>
  );
}

// setSchedDay — logica identica al monolite (array senza riposo, dedup, max 2).
function setSchedDay(
  schedule: Schedule,
  wd: WeekdayKey,
  idx: number,
  val: string,
  setSched2Open: React.Dispatch<React.SetStateAction<Partial<Record<WeekdayKey, boolean>>>>,
) {
  if (idx === 1) setSched2Open((s) => ({ ...s, [wd]: false }));
  let days = getSchedDays(schedule, wd);
  if (idx === 0) {
    if (val === 'riposo' || !val) days = [];
    else days[0] = val;
  } else {
    if (!val) days = days.slice(0, 1);
    else days[1] = val;
  }
  days = [...new Set(days.filter(Boolean))].slice(0, 2);
  void repo.set('schedule/' + wd, days.length ? days : null);
}

function resetNicWeek() {
  if (!confirm('Azzerare il piano allenamenti della settimana?')) return;
  void repo.set('schedule', null);
}

// ──────────────────────────────────────────────────────────────────────────
//  Editor dieta base · Nicholas (renderNicBaseEdit + azioni beNic*)
// ──────────────────────────────────────────────────────────────────────────
function NicBaseEdit({
  nic,
  catLabels,
  onClose,
}: {
  nic: NicholasDiet;
  catLabels: Record<string, string>;
  onClose: () => void;
}) {
  // Copia di lavoro locale (la persistenza scrive tutto il nodo, come saveNicBase).
  const [draft, setDraft] = useState<NicholasDiet>(() => structuredClone(nic));
  const [baseNicDay, setBaseNicDay] = useState<string>('corsa');

  const day = draft.days.find((x) => x.id === baseNicDay) ?? draft.days[0];
  const dayIdx = draft.days.indexOf(day);

  const save = (next: NicholasDiet) => {
    setDraft(next);
    void repo.set('nicBase', next);
  };
  const mutateDay = (fn: (d: DietDay) => void) => {
    const next = structuredClone(draft);
    fn(next.days[dayIdx]);
    save(next);
  };

  const setCatLabel = (cat: CategoriaKey, value: string) => {
    const v = value.trim();
    void repo.set('catLabels/' + cat, v || null);
  };

  return (
    <div>
      <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 bg-bg px-[18px] pb-1.5 pt-2 text-[32px] font-round tracking-tight">
        <span style={{ color: 'var(--n)' }}>Dieta base · Nicholas</span>
      </div>
      <div className="mb-1 text-sm text-muted">Modifica voci e categorie</div>
      <button
        type="button"
        onClick={() => {
          onClose();
          window.scrollTo(0, 0);
        }}
        className="mb-2 rounded-full px-3.5 py-1.5 text-sm font-bold text-white shadow-soft transition-transform duration-200 hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-none"
        style={{ background: 'var(--n)' }}
      >
        ✓ Fatto
      </button>

      <ChipRow
        items={draft.days.map((x) => ({ id: x.id, label: x.label }))}
        sel={baseNicDay}
        onSelect={setBaseNicDay}
        color="n"
      />

      <div className="rounded-card bg-card px-4 pb-3 pt-4 shadow-soft">
        {day.pasti.map((p, pi) => (
          <div key={pi} className="mb-4">
            <div className="mb-2 flex items-center gap-2 text-ink">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-nic-light text-base">
                {p.icon}
              </span>
              <span className="font-round text-[15px]">{p.nome}</span>
            </div>
            {p.items.map((it, ii) => (
              <NicItemEditor
                key={ii}
                it={it}
                onCat={(v) =>
                  mutateDay((dd) => {
                    dd.pasti[pi].items[ii].cat = v;
                  })
                }
                onDel={() => {
                  if (!confirm('Eliminare questa voce?')) return;
                  mutateDay((dd) => {
                    dd.pasti[pi].items.splice(ii, 1);
                  });
                }}
                onVal={(v) =>
                  mutateDay((dd) => {
                    dd.pasti[pi].items[ii].v = v;
                  })
                }
                onAlt={(ai, v) =>
                  mutateDay((dd) => {
                    dd.pasti[pi].items[ii].alts![ai] = v;
                  })
                }
                onAltAdd={() =>
                  mutateDay((dd) => {
                    dd.pasti[pi].items[ii].alts!.push('nuova opzione');
                  })
                }
                onAltDel={(ai) =>
                  mutateDay((dd) => {
                    const a = dd.pasti[pi].items[ii].alts!;
                    a.splice(ai, 1);
                    if (!a.length) a.push('');
                  })
                }
                onMakeAlts={() =>
                  mutateDay((dd) => {
                    const item = dd.pasti[pi].items[ii];
                    item.alts = [item.v ?? '', 'nuova opzione'];
                    delete item.v;
                  })
                }
              />
            ))}
            <button
              type="button"
              onClick={() =>
                mutateDay((dd) => {
                  dd.pasti[pi].items.push({ cat: 'carbo', v: 'nuova voce' });
                })
              }
              className="mt-1 rounded-xl border border-dashed border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors duration-200 hover:bg-nic-light/40"
            >
              + aggiungi voce
            </button>
          </div>
        ))}
      </div>

      <CatEditor catLabels={catLabels} onChange={setCatLabel} />
    </div>
  );
}

function NicItemEditor({
  it,
  onCat,
  onDel,
  onVal,
  onAlt,
  onAltAdd,
  onAltDel,
  onMakeAlts,
}: {
  it: DietItem;
  onCat: (v: CategoriaKey) => void;
  onDel: () => void;
  onVal: (v: string) => void;
  onAlt: (ai: number, v: string) => void;
  onAltAdd: () => void;
  onAltDel: (ai: number) => void;
  onMakeAlts: () => void;
}) {
  return (
    <div className="mb-3 rounded-xl border border-line border-l-2 border-l-nic/40 bg-[#FAFCFB] p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <select
          className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-sm"
          value={it.cat}
          onChange={(e) => onCat(e.target.value as CategoriaKey)}
        >
          {catOptionEls()}
        </select>
        <button
          type="button"
          title="Elimina voce"
          onClick={onDel}
          className="ml-auto text-base text-red-500"
        >
          🗑
        </button>
      </div>
      {it.alts ? (
        <>
          {it.alts.map((a, ai) => (
            <div key={ai} className="mb-1 flex items-center gap-1.5">
              <input
                className="flex-1 rounded-xl border border-line bg-white px-2.5 py-1.5 text-sm"
                defaultValue={a}
                onChange={(e) => onAlt(ai, e.target.value)}
              />
              <button type="button" title="Rimuovi opzione" onClick={() => onAltDel(ai)} className="text-muted">
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onAltAdd}
            className="rounded-xl border border-dashed border-line px-2.5 py-1 text-xs font-semibold text-muted transition-colors duration-200 hover:bg-nic-light/40"
          >
            + opzione
          </button>
        </>
      ) : (
        <>
          <div className="mb-1 flex items-center gap-1.5">
            <input
              className="flex-1 rounded-xl border border-line bg-white px-2.5 py-1.5 text-sm"
              defaultValue={it.v ?? ''}
              onChange={(e) => onVal(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={onMakeAlts}
            className="rounded-xl border border-dashed border-line px-2.5 py-1 text-xs font-semibold text-muted transition-colors duration-200 hover:bg-nic-light/40"
          >
            + opzione
          </button>
        </>
      )}
    </div>
  );
}

export { MSG_SAVED };
