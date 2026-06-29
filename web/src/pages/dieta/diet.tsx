// Componenti/utility condivisi tra le pagine Nicholas e Noemi.
// Portano FEDELMENTE i render helper del monolite (catPill, foodRow, choiceBox,
// renderInteg, renderItem, renderNicholasDay) in React+TS, e definiscono le
// classi/stili equivalenti alle CSS class del vecchio index.html (qui inline via
// Tailwind + CSS var storiche, perche' l'agente non puo' toccare i file condivisi).

import { useState } from 'react';
import { CAT } from '@/lib/dietData';
import type {
  CategoriaKey,
  DietDay,
  DietItem,
  DietPasto,
  Integ,
} from '@/lib/types';

// ── etichetta categoria (catPill): override da catLabels, fallback su CAT ──
export function catLabel(
  cat: string,
  catLabels: Record<string, string>,
): string {
  return (
    (catLabels && catLabels[cat]) ||
    (CAT[cat as CategoriaKey] || CAT.altro).pill
  );
}

// Colori "pill" per categoria — equivalenti alle .cat-pill.<cat> del monolite.
const CAT_PILL_STYLE: Record<string, { bg: string; fg: string }> = {
  carbo: { bg: '#FEF3C7', fg: '#92400E' },
  prot: { bg: '#FEE2E2', fg: '#991B1B' },
  frutta: { bg: '#FCE7F3', fg: '#9D174D' },
  latte: { bg: '#E0F2FE', fg: '#075985' },
  grasso: { bg: '#F3E8FF', fg: '#6B21A8' },
  sfizio: { bg: '#FFE4E6', fg: '#9F1239' },
  verdura: { bg: '#DCFCE7', fg: '#166534' },
  bevanda: { bg: '#F1F5F9', fg: '#475569' },
  olio: { bg: '#ECFCCB', fg: '#3F6212' },
  integra: { bg: '#E0E7FF', fg: '#3730A3' },
  scegli: { bg: '#FEF9C3', fg: '#854D0E' },
  altro: { bg: '#F1F5F9', fg: '#475569' },
};

export function CatPill({
  cat,
  catLabels,
  className,
}: {
  cat: string;
  catLabels: Record<string, string>;
  className?: string;
}) {
  const s = CAT_PILL_STYLE[cat] || CAT_PILL_STYLE.altro;
  return (
    <span
      className={
        'inline-block flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ' +
        (className ?? '')
      }
      style={{ background: s.bg, color: s.fg }}
    >
      {catLabel(cat, catLabels)}
    </span>
  );
}

// ── foodRow ──
export function FoodRow({
  cat,
  text,
  catLabels,
}: {
  cat: string;
  text: string;
  catLabels: Record<string, string>;
}) {
  return (
    <div className="flex items-start gap-2 py-1">
      <CatPill cat={cat} catLabels={catLabels} />
      <span className="text-sm leading-snug text-ink">{text}</span>
    </div>
  );
}

// ── choiceBox (accordion "N scelte") ──
export function ChoiceBox({
  cat,
  opts,
  shared,
  catLabels,
}: {
  cat: string;
  opts: string[];
  shared?: string;
  catLabels: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const word = opts.length > 1 ? 'scelte' : 'scelta';
  return (
    <div className="my-1 overflow-hidden rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 bg-bg/60 px-2.5 py-2 text-left"
      >
        <CatPill cat={cat} catLabels={catLabels} />
        <span className="text-xs font-semibold text-muted">
          {opts.length} {word}
        </span>
        <span
          className="ml-auto text-muted transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-3 pb-2 pt-1">
          {opts.map((o, i) => (
            <div key={i} className="border-t border-line/60 py-1.5 text-sm text-ink first:border-0">
              {o}
            </div>
          ))}
          {shared && <div className="py-1.5 text-sm font-semibold text-muted">+ {shared}</div>}
        </div>
      )}
    </div>
  );
}

// ── renderItem ──
export function DietItemView({
  it,
  catLabels,
}: {
  it: DietItem;
  catLabels: Record<string, string>;
}) {
  if (it.alts) {
    return <ChoiceBox cat={it.cat} opts={it.alts} catLabels={catLabels} />;
  }
  return <FoodRow cat={it.cat} text={it.v ?? ''} catLabels={catLabels} />;
}

// ── renderInteg (banner integrazione) ──
export function IntegBanner({ integ }: { integ?: Integ }) {
  if (!integ) return null;
  const rows: { tag: string; v: string }[] = integ.multi
    ? integ.multi
    : [
        ...(integ.pre ? [{ tag: 'Pre', v: integ.pre }] : []),
        ...(integ.post ? [{ tag: 'Post', v: integ.post }] : []),
      ];
  return (
    <div className="mb-3 rounded-card p-3 text-white" style={{ background: 'var(--n-g)' }}>
      <div className="mb-1.5 text-sm font-extrabold">💊 Integrazione</div>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold">{r.tag}</span>
          <span className="text-sm">{r.v}</span>
        </div>
      ))}
    </div>
  );
}

// ── meal card (sezione pasto, riusata da Nicholas day) ──
export function MealCard({
  pasto,
  catLabels,
}: {
  pasto: DietPasto;
  catLabels: Record<string, string>;
}) {
  return (
    <div className="mb-3 overflow-hidden rounded-card bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="text-lg">{pasto.icon}</span>
        <span className="font-bold text-ink">{pasto.nome}</span>
        {pasto.note && <span className="text-xs italic text-muted">{pasto.note}</span>}
      </div>
      <div className="px-4 py-2">
        {pasto.items.map((it, i) => (
          <DietItemView key={i} it={it} catLabels={catLabels} />
        ))}
      </div>
    </div>
  );
}

// ── renderNicholasDay ──
export function NicholasDayView({
  day,
  catLabels,
}: {
  day: DietDay;
  catLabels: Record<string, string>;
}) {
  return (
    <div>
      <IntegBanner integ={day.integ} />
      {day.pasti.map((p, i) => (
        <MealCard key={i} pasto={p} catLabels={catLabels} />
      ))}
      {day.pastoLibero && (
        <div
          className="rounded-card border p-3 text-sm font-semibold"
          style={{ background: '#FEFCE8', borderColor: '#FDE047', color: '#854D0E' }}
        >
          {day.pastoLibero}
        </div>
      )}
    </div>
  );
}

// ── chip row (chips disciplina / pasti) ──
export function ChipRow({
  items,
  sel,
  onSelect,
  color, // 'n' | 'e'
}: {
  items: { id: string; label: string }[];
  sel: string;
  onSelect: (id: string) => void;
  color: 'n' | 'e';
}) {
  const selBg = color === 'n' ? 'var(--n)' : 'var(--e)';
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1" style={{ scrollbarWidth: 'none' }}>
      {items.map((it) => {
        const active = sel === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSelect(it.id)}
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold transition-colors"
            style={
              active
                ? { background: selBg, color: '#fff' }
                : { background: '#fff', color: 'var(--text)', border: '1px solid var(--border)' }
            }
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// ── editor categorie (renderCatEditor) ──
const CAT_EDIT: CategoriaKey[] = [
  'carbo',
  'prot',
  'frutta',
  'verdura',
  'latte',
  'grasso',
  'sfizio',
  'bevanda',
  'olio',
];

export function CatEditor({
  catLabels,
  onChange,
}: {
  catLabels: Record<string, string>;
  onChange: (cat: CategoriaKey, value: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 mt-3.5 text-sm font-bold text-muted">🏷️ Rinomina categorie</div>
      <div className="rounded-card bg-card p-3.5 shadow-sm">
        {CAT_EDIT.map((c) => (
          <div key={c} className="mb-2 flex items-center gap-2 last:mb-0">
            <CatPill cat={c} catLabels={catLabels} />
            <input
              className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-sm"
              defaultValue={catLabels[c] || CAT[c].pill}
              onChange={(e) => onChange(c, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── select categoria (catOptions) per gli editor ──
export function catOptionEls() {
  return (Object.keys(CAT) as CategoriaKey[]).map((k) => (
    <option key={k} value={k}>
      {CAT[k].pill}
    </option>
  ));
}
