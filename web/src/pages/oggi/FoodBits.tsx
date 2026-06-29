// Componenti foglia della vista OGGI: pill categoria, riga cibo, choice box,
// e il render di un DietItem. Portati FEDELI da catPill/foodRow/choiceBox/renderItem
// del monolite index.html.

import { useState } from 'react';
import { CAT } from '@/lib/dietData';
import type { CategoriaKey, DietItem } from '@/lib/types';

/** Etichetta della pill categoria, con override da `catLabels` (come `catPill`). */
function catLabel(cat: CategoriaKey, catLabels: Record<string, string>): string {
  return (catLabels && catLabels[cat]) || (CAT[cat] || CAT.altro).pill;
}

/** Pill categoria (come `catPill`). */
export function CatPill({
  cat,
  catLabels,
}: {
  cat: CategoriaKey;
  catLabels: Record<string, string>;
}) {
  return <span className={`cat-pill ${cat}`}>{catLabel(cat, catLabels)}</span>;
}

/** Riga cibo a valore fisso (come `foodRow`). */
export function FoodRow({
  cat,
  text,
  catLabels,
}: {
  cat: CategoriaKey;
  text: string;
  catLabels: Record<string, string>;
}) {
  return (
    <div className="food-row">
      <CatPill cat={cat} catLabels={catLabels} />
      <span className="food-text">{text}</span>
    </div>
  );
}

/** Box a scelte multiple, espandibile (come `choiceBox` + `toggleChoice`). */
export function ChoiceBox({
  cat,
  opts,
  shared,
  catLabels,
}: {
  cat: CategoriaKey;
  opts: string[];
  shared?: string;
  catLabels: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const word = opts.length > 1 ? 'scelte' : 'scelta';
  return (
    <div className={`choice${open ? ' open' : ''}`}>
      <div className="choice-head" onClick={() => setOpen((o) => !o)}>
        <CatPill cat={cat} catLabels={catLabels} />
        <span className="choice-count">
          {opts.length} {word}
        </span>
        <span className="choice-arrow">▾</span>
      </div>
      <div className="choice-body">
        <div className="choice-inner">
          {opts.map((o, i) => (
            <div className="choice-opt" key={i}>
              {o}
            </div>
          ))}
          {shared ? <div className="choice-shared">+ {shared}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** Render di un DietItem: alts → ChoiceBox, altrimenti FoodRow (come `renderItem`). */
export function RenderItem({
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

/** Stato vuoto garbato della colonna (al posto del vecchio "—"). */
export function Dash() {
  return <div className="cmp-empty">niente oggi</div>;
}
