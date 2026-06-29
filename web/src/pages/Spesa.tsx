// Vista SPESA — porting fedele di renderSpesaTab + getSpesaCats e relativa logica
// dal monolite index.html. Dati in lettura dallo store (`useStore`); scritture via
// `repo.set` sui nodi `spesa`, `spesaCategories`, `spesaHistory`, `pantry`, `spesaMeta`.
//
// Nodi e chiavi IDENTICI al monolite:
//  - spesa/{cat}      = Array<{t,d,owners}>
//  - pantry           = Array<{t,owners,cat,active}>
//  - spesaCategories/{key} = {label,order}
//  - spesaHistory/{ts}     = {date, items:{cat:[...]}}
//  - spesaMeta             = {by, at}  (helper markSpesaEdit)
//
// La vista è "controllata dallo store": ogni mutazione scrive su Firebase e l'update
// realtime re-renderizza. Lo stato LOCALE tiene solo l'UI transitoria (filtri owner,
// vista lista, apertura category manager) — come le variabili globali del monolite
// `spesaOwners` / `listView` / `categoryManager` (che lì non erano persistite).

import { useCallback, useMemo, useRef, useState } from 'react';
import { repo } from '@/data';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { personOf } from '@/lib/constants';
import { esc, fmtWhen } from '@/lib/utils';
import { SPESA_CSS } from '@/pages/spesa/spesaStyles';
import type {
  PantryItem,
  SpesaCat,
  SpesaCategoriesMap,
  SpesaHistoryMap,
  SpesaItem,
  SpesaMap,
} from '@/pages/spesa/types';

// ── default categorie (identiche al monolite) ──
const SPESA_CATS_DEFAULT: Array<{ key: string; label: string; order: number }> = [
  { key: 'panetteria', label: '🥖 Panetteria', order: 1 },
  { key: 'cereali', label: '🌾 Cereali', order: 2 },
  { key: 'dispensa', label: '🥫 Dispensa', order: 3 },
  { key: 'latticini', label: '🥛 Latticini', order: 4 },
  { key: 'banco', label: '🥚 Banco fresco', order: 5 },
  { key: 'macelleria', label: '🥩 Macelleria', order: 6 },
  { key: 'pescheria', label: '🐟 Pescheria', order: 7 },
  { key: 'verdure', label: '🥦 Verdure', order: 8 },
  { key: 'frutta', label: '🍓 Frutta', order: 9 },
  { key: 'surgelati', label: '❄️ Surgelati', order: 10 },
  { key: 'integratori', label: '💊 Integratori', order: 11 },
  { key: 'casa', label: '🧴 Casa', order: 12 },
];

const OWNER_KEYS = ['nicholas', 'noemi', 'gatto', 'coniglio'] as const;
type OwnerKey = (typeof OWNER_KEYS)[number];
type ListView = 'dispensa' | 'tocomprare' | null;

// ── helper puri (locali — riusano esc/fmtWhen condivisi) ──
function getSpesaCats(spesa: SpesaMap, spesaCategories: SpesaCategoriesMap): SpesaCat[] {
  const all: SpesaCat[] = SPESA_CATS_DEFAULT.map((c) => ({ ...c, custom: false }));
  Object.entries(spesaCategories || {}).forEach(([k, v]) => {
    const idx = all.findIndex((x) => x.key === k);
    if (idx < 0) {
      all.push({ key: k, label: v.label || k, order: v.order || 100, custom: true });
    } else {
      if (v.label) all[idx]!.label = v.label;
      if (v.order) all[idx]!.order = v.order;
    }
  });
  // safety: categorie orfane con articoli ancora presenti
  Object.keys(spesa || {}).forEach((k) => {
    if ((spesa[k] || []).length && !all.find((x) => x.key === k))
      all.push({ key: k, label: '📦 ' + k, order: 200, custom: true });
  });
  return all.sort((a, b) => (a.order || 100) - (b.order || 100));
}

// separa emoji iniziale dal resto (come splitLabel del monolite)
function splitLabel(label: string): [string, string] {
  const parts = label.split(' ');
  if (parts.length > 1 && !/^[a-zA-Z0-9]/.test(parts[0]!))
    return [parts[0]!, parts.slice(1).join(' ')];
  return ['', label];
}

export default function Spesa() {
  const store = useStore();
  const { user } = useAuth();

  // narrow dei nodi grezzi dello store ai tipi reali della vista
  const spesa = (store.spesa as SpesaMap | null) || {};
  const spesaCategories = (store.spesaCategories as SpesaCategoriesMap | null) || {};
  const spesaHistory = (store.spesaHistory as SpesaHistoryMap | null) || {};
  const pantry = (store.pantry as PantryItem[] | null) || [];
  const spesaMeta = store.spesaMeta;

  // stato UI transitorio (erede delle globali non persistite del monolite)
  const [spesaOwners, setSpesaOwners] = useState<OwnerKey[]>([]);
  const [listView, setListView] = useState<ListView>(null);
  const [categoryManager, setCategoryManager] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // input "aggiungi…" per categoria (non controllato dallo store)
  const addInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const MSG_SAVED = '✓ Salvato';

  const currentUserName = useCallback((): string => {
    const e = user?.email || '';
    const p = personOf(e);
    return p?.nome || e || '?';
  }, [user]);

  // ── scritture base ──
  const markSpesaEdit = useCallback(() => {
    void repo.set('spesaMeta', { by: currentUserName(), at: Date.now() });
  }, [currentUserName]);

  // scrive una categoria (null se vuota) + markSpesaEdit. Riceve la lista già aggiornata.
  const saveSpesaCat = useCallback(
    (cat: string, list: SpesaItem[]) => {
      void repo.set('spesa/' + cat, list && list.length ? list : null);
      markSpesaEdit();
    },
    [markSpesaEdit],
  );

  const savePantry = useCallback(
    (next: PantryItem[]) => {
      void repo.set('pantry', next.length ? next : null);
      markSpesaEdit();
    },
    [markSpesaEdit],
  );

  // aggiunge una voce a una categoria evitando duplicati (case-insensitive); muta `acc`.
  const addSpesaItem = useCallback(
    (acc: SpesaMap, cat: string, t: string, owners?: string[]): boolean => {
      const list = (acc[cat] || []).slice();
      const have = new Set(list.filter((i) => i && i.t).map((i) => i.t.toLowerCase()));
      if (have.has((t || '').toLowerCase())) return false;
      list.push({ t, d: false, owners: owners || [] });
      acc[cat] = list;
      return true;
    },
    [],
  );

  const cats = useMemo(
    () => getSpesaCats(spesa, spesaCategories),
    [spesa, spesaCategories],
  );

  // ── conteggi / progress ──
  const { total, done } = useMemo(() => {
    let t = 0;
    let d = 0;
    cats.forEach((c) =>
      (spesa[c.key] || []).forEach((i) => {
        t++;
        if (i.d) d++;
      }),
    );
    return { total: t, done: d };
  }, [cats, spesa]);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const histCount = Object.keys(spesaHistory || {}).length;

  const ownerFilter = spesaOwners.length > 0;
  const matchOwner = (it: { owners?: string[] }) =>
    spesaOwners.some((o) => (it.owners || []).includes(o));
  const pantryView = listView === 'dispensa';
  const toBuyView = listView === 'tocomprare';
  const filtered = ownerFilter || pantryView;

  // ── handlers articoli (replicano i window.* del monolite) ──
  const addSpesa = (cat: string) => {
    const el = addInputs.current[cat];
    const v = (el ? el.value : '').trim();
    if (!v) return;
    const list = (spesa[cat] || []).slice();
    list.push({ t: v, d: false });
    if (el) el.value = '';
    saveSpesaCat(cat, list);
  };

  const toggleSpesa = (cat: string, i: number) => {
    const list = (spesa[cat] || []).slice();
    if (!list[i]) return;
    list[i] = { ...list[i]!, d: !list[i]!.d };
    saveSpesaCat(cat, list);
  };

  const delSpesa = (cat: string, i: number) => {
    const list = (spesa[cat] || []).slice();
    list.splice(i, 1);
    saveSpesaCat(cat, list);
  };

  const renameSpesaItem = (cat: string, i: number, text: string) => {
    const v = (text || '').replace(/\s+/g, ' ').trim();
    const list = (spesa[cat] || []).slice();
    if (!list[i]) return;
    if (!v || v === list[i]!.t) return; // vuoto o invariato: ignora
    list[i] = { ...list[i]!, t: v };
    saveSpesaCat(cat, list);
    toast('✓ Rinominato');
  };

  const toggleCatAll = (cat: string) => {
    const list = (spesa[cat] || []).slice();
    if (!list.length) return;
    const all = list.every((i) => i.d);
    const next = list.map((i) => ({ ...i, d: !all }));
    saveSpesaCat(cat, next);
  };

  const toggleAllSpesa = () => {
    const allDone =
      cats.every((c) => (spesa[c.key] || []).every((i) => i.d)) &&
      cats.some((c) => (spesa[c.key] || []).length > 0);
    const newSpesa: SpesaMap = {};
    cats.forEach((c) => {
      const l = (spesa[c.key] || []).map((i) => ({ ...i, d: !allDone }));
      if (l.length) newSpesa[c.key] = l;
    });
    void repo.set('spesa', Object.keys(newSpesa).length ? newSpesa : null);
    markSpesaEdit();
  };

  // ── Spesa fatta: i flaggati → dispensa; i non spuntati restano ──
  const spesaFatta = () => {
    const snapItems: Record<string, SpesaItem[]> = {};
    const newSpesa: SpesaMap = {};
    const nextPantry = pantry.slice();
    let moved = 0;
    cats.forEach((c) => {
      const list = spesa[c.key] || [];
      const taken = list.filter((i) => i.d);
      const leftover = list.filter((i) => !i.d);
      if (taken.length) snapItems[c.key] = taken;
      taken.forEach((it) => {
        if (!nextPantry.some((p) => p.t.toLowerCase() === it.t.toLowerCase())) {
          nextPantry.push({ t: it.t, owners: it.owners || [], cat: c.key, active: true });
        }
        moved++;
      });
      if (leftover.length) newSpesa[c.key] = leftover;
    });
    if (!moved) return toast('Spunta gli articoli comprati prima di premere Spesa fatta');
    if (!window.confirm(`Segnare ${moved} articoli come comprati (vanno in dispensa)?`))
      return;
    const ts = Date.now();
    void repo.set('spesaHistory/' + ts, {
      date: new Date().toLocaleDateString('it-IT'),
      items: snapItems,
    });
    void repo.set('spesa', Object.keys(newSpesa).length ? newSpesa : null);
    savePantry(nextPantry);
    toast(`✓ ${moved} in dispensa`);
  };

  // ── Svuota dispensa: rimette tutto in lista (non cancella) ──
  const svuotaDispensa = () => {
    if (!pantry.length) return toast('La dispensa è già vuota');
    if (!window.confirm(`Rimettere in lista i ${pantry.length} articoli della dispensa?`))
      return;
    const acc: SpesaMap = {};
    Object.keys(spesa).forEach((k) => {
      if ((spesa[k] || []).length) acc[k] = spesa[k]!.slice();
    });
    pantry.forEach((p) => addSpesaItem(acc, p.cat || 'dispensa', p.t, p.owners));
    void repo.set('spesa', Object.keys(acc).length ? acc : null);
    void repo.set('pantry', null);
    markSpesaEdit();
    toast('↩️ Articoli rimessi in lista');
  };

  // ── Recupero d'emergenza dalla cronologia ──
  const recuperaStorico = () => {
    const snaps = Object.values(spesaHistory || {});
    if (!snaps.length) return toast('Nessuna cronologia da cui recuperare');
    if (
      !window.confirm(
        'Recuperare tutti gli articoli salvati nella cronologia e rimetterli in lista?',
      )
    )
      return;
    const acc: SpesaMap = {};
    Object.keys(spesa).forEach((k) => {
      if ((spesa[k] || []).length) acc[k] = spesa[k]!.slice();
    });
    let added = 0;
    snaps.forEach((h) =>
      Object.entries(h.items || {}).forEach(([cat, arr]) =>
        (arr || []).forEach((i) => {
          if (i && i.t && addSpesaItem(acc, cat, i.t, i.owners)) added++;
        }),
      ),
    );
    void repo.set('spesa', Object.keys(acc).length ? acc : null);
    markSpesaEdit();
    toast(`↩️ ${added} articoli recuperati`);
  };

  const clearHistory = () => {
    const n = Object.keys(spesaHistory || {}).length;
    if (
      !window.confirm(
        'Svuotare la cronologia delle ' +
          n +
          " spese memorizzate? L'AI non imparerà più dal pregresso.",
      )
    )
      return;
    void repo.set('spesaHistory', null);
    toast('🧹 Cronologia svuotata');
  };

  // ── pantry: 🏠 sposta in dispensa / rimette in lista ──
  const toPantry = (cat: string, idx: number) => {
    const list = (spesa[cat] || []).slice();
    const it = list[idx];
    if (!it) return;
    list.splice(idx, 1);
    saveSpesaCat(cat, list);
    let nextPantry: PantryItem[];
    if (!pantry.some((p) => p.t.toLowerCase() === it.t.toLowerCase())) {
      nextPantry = pantry.concat({ t: it.t, owners: it.owners || [], cat, active: true });
    } else {
      nextPantry = pantry.map((p) =>
        p.t.toLowerCase() === it.t.toLowerCase() ? { ...p, active: true, cat } : p,
      );
    }
    savePantry(nextPantry);
    toast('🏠 In dispensa');
  };

  const fromPantry = (i: number) => {
    const p = pantry[i];
    if (!p) return;
    const cat = p.cat || 'dispensa';
    const list = (spesa[cat] || []).slice();
    if (!list.some((x) => x && x.t && x.t.toLowerCase() === p.t.toLowerCase()))
      list.push({ t: p.t, d: false, owners: p.owners || [] });
    saveSpesaCat(cat, list);
    const nextPantry = pantry.slice();
    nextPantry.splice(i, 1);
    savePantry(nextPantry);
    toast('Rimesso in lista');
  };

  // ── toggle owner su voce (cat === '__pantry' agisce sul pantry) ──
  const toggleOwner = (cat: string, idx: number, owner: OwnerKey) => {
    if (cat === '__pantry') {
      const p = pantry[idx];
      if (!p) return;
      const owners = (p.owners || []).slice();
      const pos = owners.indexOf(owner);
      if (pos >= 0) owners.splice(pos, 1);
      else owners.push(owner);
      const nextPantry = pantry.slice();
      nextPantry[idx] = { ...p, owners };
      savePantry(nextPantry);
      return;
    }
    const list = (spesa[cat] || []).slice();
    if (!list[idx]) return;
    const owners = (list[idx]!.owners || []).slice();
    const pos = owners.indexOf(owner);
    if (pos >= 0) owners.splice(pos, 1);
    else owners.push(owner);
    list[idx] = { ...list[idx]!, owners };
    saveSpesaCat(cat, list);
  };

  // ── filtri ──
  const toggleOwnerFilter = (o: OwnerKey) => {
    setListView(null); // gli owner azzerano la vista dispensa/da-comprare
    setSpesaOwners((prev) =>
      prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o],
    );
  };
  const setListViewToggle = (v: Exclude<ListView, null>) => {
    setListView((prev) => {
      const next = prev === v ? null : v;
      if (next) setSpesaOwners([]);
      return next;
    });
  };

  // ── category manager ──
  const saveCatInline = (key: string, newEmoji: string | null, newName: string | null) => {
    const c = cats.find((x) => x.key === key);
    if (!c) return;
    const [curEmoji, curName] = splitLabel(c.label);
    const emoji = newEmoji !== null ? newEmoji.trim() : curEmoji;
    const name = newName !== null ? newName.trim() : curName;
    if (!name) return toast('Il nome non può essere vuoto');
    const label = (emoji ? emoji + ' ' : '') + name;
    const order = c.order || 100;
    void repo.set('spesaCategories/' + key, { label, order });
    toast(MSG_SAVED);
  };
  const managerAddNewCat = () => {
    const newKey = 'cat_' + Date.now();
    const order = Math.max(...cats.map((c) => c.order || 100)) + 1;
    void repo.set('spesaCategories/' + newKey, { label: '🆕 Nuova categoria', order });
  };
  const deleteCategoryEdit = (key: string) => {
    if (!window.confirm('Eliminare questa categoria e tutti gli articoli?')) return;
    void repo.set('spesaCategories/' + key, null);
    void repo.set('spesa/' + key, null);
    toast('✓ Categoria eliminata');
  };

  // ── DRAG-TO-REORDER categorie (reflow live nel DOM, poi salvataggio) ──
  const catDrag = useRef<{
    row: HTMLElement;
    list: HTMLElement;
    handle: HTMLElement;
    startY: number;
    pointerId: number;
  } | null>(null);

  const catDragMove = useCallback((e: PointerEvent) => {
    const d = catDrag.current;
    if (!d) return;
    e.preventDefault();
    const { row, list } = d;
    const y = e.clientY;
    row.style.transform = `translateY(${y - d.startY}px) scale(1.02)`;
    const sibs = [
      ...list.querySelectorAll<HTMLElement>('.catman-row:not(.catman-dragging)'),
    ];
    let target: HTMLElement | null = null;
    for (const sib of sibs) {
      const r = sib.getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        target = sib;
        break;
      }
    }
    const before = row.offsetTop;
    if (target) list.insertBefore(row, target);
    else list.appendChild(row);
    const after = row.offsetTop;
    if (after !== before) {
      d.startY += after - before;
      row.style.transform = `translateY(${y - d.startY}px) scale(1.02)`;
    }
  }, []);

  const saveCatOrder = useCallback(
    (keys: string[]) => {
      const map: Record<string, SpesaCat> = {};
      cats.forEach((c) => {
        map[c.key] = c;
      });
      keys.forEach((k, i) => {
        const c = map[k];
        if (!c) return;
        void repo.set('spesaCategories/' + k, { label: c.label, order: i + 1 });
      });
    },
    [cats],
  );

  const catDragEnd = useCallback(() => {
    const d = catDrag.current;
    if (!d) return;
    const { row, list } = d;
    document.removeEventListener('pointermove', catDragMove);
    document.removeEventListener('pointerup', catDragEnd);
    document.removeEventListener('pointercancel', catDragEnd);
    row.style.transition = 'transform .2s cubic-bezier(.2,.8,.3,1)';
    row.style.transform = '';
    const keys = [...list.querySelectorAll<HTMLElement>('.catman-row')].map(
      (r) => r.dataset.key || '',
    );
    setTimeout(() => {
      row.style.transition = '';
      row.classList.remove('catman-dragging');
    }, 210);
    catDrag.current = null;
    saveCatOrder(keys);
  }, [catDragMove, saveCatOrder]);

  const catDragStart = (e: React.PointerEvent, _key: string) => {
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    const row = handle.closest('.catman-row') as HTMLElement | null;
    if (!row) return;
    const list = row.parentElement as HTMLElement;
    row.classList.add('catman-dragging');
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    catDrag.current = { row, list, handle, startY: e.clientY, pointerId: e.pointerId };
    document.addEventListener('pointermove', catDragMove, { passive: false });
    document.addEventListener('pointerup', catDragEnd);
    document.addEventListener('pointercancel', catDragEnd);
  };

  // ── owner badges (porting di ownerBadgesHTML) ──
  const ownerBadges = (owners: string[] | undefined, cat: string, idx: number) => {
    const has = (o: string) => !!(owners && owners.includes(o));
    const defs: Array<[OwnerKey, string, string, string]> = [
      ['nicholas', 'n', 'N', 'Nicholas'],
      ['noemi', 'e', 'N', 'Noemi'],
      ['gatto', 'g', '🐈', 'Mia'],
      ['coniglio', 'c', '🐰', 'Ginger'],
    ];
    return (
      <span className="owner-badges">
        {defs.map(([o, cls, txt, title]) => (
          <span
            key={o}
            className={`owner-badge ${cls} ${has(o) ? '' : 'off'}`}
            onClick={() => toggleOwner(cat, idx, o)}
            title={title}
          >
            {txt}
          </span>
        ))}
      </span>
    );
  };

  const alpha = (a: { t?: string }, b: { t?: string }) =>
    (a.t || '').localeCompare(b.t || '', 'it', { sensitivity: 'base' });

  // ── render lista ──
  const masterRow =
    total > 0 && !filtered ? (
      <div className="shop-sec" style={{ borderBottom: '2px solid #EEF0F3' }}>
        <div className="shop-sec-h">
          <button
            className={`sp-circle sm ${done === total ? 'on' : ''}`}
            onClick={toggleAllSpesa}
            aria-label="seleziona tutto"
          />
          <span className="shop-sec-name">
            {done === total ? 'Deseleziona tutto' : 'Seleziona tutto'}
          </span>
        </div>
      </div>
    ) : null;

  return (
    <div className="spesa-scope">
      <style>{SPESA_CSS}</style>

      <div className="page-title">Spesa</div>
      <div className="shop-prog">
        <div className="shop-prog-txt">
          {total ? done + ' / ' + total + ' presi' : 'lista vuota'}
        </div>
        <div className="shop-prog-track">
          <div className="shop-prog-fill" style={{ width: pct + '%' }} />
        </div>
      </div>

      <div className="vsub">
        <div className="shop-actions">
          <button className="shop-tool gen" onClick={spesaFatta}>
            ✓ Spesa fatta
          </button>
          <button className="shop-tool sec" onClick={svuotaDispensa}>
            Svuota dispensa
          </button>
          <button
            className="shop-tool icon"
            style={{ marginLeft: 'auto' }}
            onClick={() => setCategoryManager((v) => !v)}
            title="Categorie"
          >
            ⚙️
          </button>
        </div>
        <div className="shop-filters">
          <button
            className={`shop-filter f-nicholas ${spesaOwners.includes('nicholas') ? 'on' : ''}`}
            onClick={() => toggleOwnerFilter('nicholas')}
          >
            🔵 Nicholas
          </button>
          <button
            className={`shop-filter f-noemi ${spesaOwners.includes('noemi') ? 'on' : ''}`}
            onClick={() => toggleOwnerFilter('noemi')}
          >
            🩷 Noemi
          </button>
          <button
            className={`shop-filter f-gatto ${spesaOwners.includes('gatto') ? 'on' : ''}`}
            onClick={() => toggleOwnerFilter('gatto')}
          >
            🐈 Mia
          </button>
          <button
            className={`shop-filter f-coniglio ${spesaOwners.includes('coniglio') ? 'on' : ''}`}
            onClick={() => toggleOwnerFilter('coniglio')}
          >
            🐰 Ginger
          </button>
        </div>
        <div className="shop-filters">
          <button
            className={`shop-filter f-tobuy ${listView === 'tocomprare' ? 'on' : ''}`}
            onClick={() => setListViewToggle('tocomprare')}
          >
            🛒 Da comprare
          </button>
          <button
            className={`shop-filter f-pantry ${listView === 'dispensa' ? 'on' : ''}`}
            onClick={() => setListViewToggle('dispensa')}
          >
            🏠 Dispensa
          </button>
        </div>
      </div>

      <div className="shop">
        {masterRow}
        {cats.map((c) => {
          let items = pantryView
            ? []
            : (spesa[c.key] || []).map((it, idx) => ({ ...it, idx }));
          if (ownerFilter) items = items.filter(matchOwner);
          items.sort(alpha);
          const allc = items.length > 0 && items.every((i) => i.d);
          const toBuy = items.filter((i) => !i.d).length;

          let pantryItems = toBuyView
            ? []
            : pantry
                .map((p, pi) => ({ ...p, pi }))
                .filter(
                  (p) =>
                    (p.cat || 'dispensa') === c.key &&
                    (pantryView || p.active !== false),
                );
          if (ownerFilter) pantryItems = pantryItems.filter(matchOwner);
          pantryItems.sort(alpha);

          const isEmpty = items.length === 0 && pantryItems.length === 0;
          if (filtered && isEmpty) return null;

          if (isEmpty) {
            return (
              <div className="shop-sec" key={c.key}>
                <div className="shop-sec-h" style={{ color: '#CDD1D9' }}>
                  <span className="shop-sec-name">{c.label}</span>
                </div>
                <div className="shop-addrow">
                  <span className="shop-plus">+</span>
                  <input
                    className="shop-in"
                    placeholder="aggiungi…"
                    ref={(el) => {
                      addInputs.current[c.key] = el;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSpesa(c.key);
                      }
                    }}
                  />
                </div>
              </div>
            );
          }

          return (
            <div className="shop-sec" key={c.key}>
              <div className="shop-sec-h">
                <button
                  className={`sp-circle sm ${allc ? 'on' : ''}`}
                  onClick={() => toggleCatAll(c.key)}
                  aria-label="tutto"
                />
                <span className="shop-sec-name">{c.label}</span>
                {toBuy ? <span className="shop-sec-n">{toBuy}</span> : null}
              </div>

              {items.map((it) => (
                <div className={`shop-row ${it.d ? 'done' : ''}`} key={'i' + it.idx}>
                  <button
                    className={`sp-circle ${it.d ? 'on' : ''}`}
                    onClick={() => toggleSpesa(c.key, it.idx)}
                  />
                  <button
                    className="shop-pantry-btn"
                    onClick={() => toPantry(c.key, it.idx)}
                    title="Ho già in casa"
                  >
                    🏠
                  </button>
                  <span
                    className="shop-name"
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    onBlur={(e) =>
                      renameSpesaItem(c.key, it.idx, e.currentTarget.textContent || '')
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                  >
                    {it.t}
                  </span>
                  {ownerBadges(it.owners, c.key, it.idx)}
                  <button className="shop-x" onClick={() => delSpesa(c.key, it.idx)}>
                    ✕
                  </button>
                </div>
              ))}

              {pantryItems.map((p) => (
                <div className="shop-row pantry-row" key={'p' + p.pi}>
                  <span className="pantry-check" title="In dispensa" />
                  <button
                    className="shop-pantry-btn on"
                    onClick={() => fromPantry(p.pi)}
                    title="Rimetti in lista"
                  >
                    🏠
                  </button>
                  <span className="shop-name">{p.t}</span>
                  {ownerBadges(p.owners, '__pantry', p.pi)}
                </div>
              ))}

              {filtered ? null : (
                <div className="shop-addrow">
                  <span className="shop-plus">+</span>
                  <input
                    className="shop-in"
                    placeholder="aggiungi…"
                    ref={(el) => {
                      addInputs.current[c.key] = el;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addSpesa(c.key);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {histCount ? (
        <div className="shop-hist">
          <button onClick={recuperaStorico}>↩️ Recupera da cronologia</button>
          <button onClick={clearHistory}>🧹 Svuota cronologia ({histCount})</button>
        </div>
      ) : null}

      {spesaMeta && spesaMeta.at ? (
        <div className="spesa-meta">
          <span className="ini">{esc((spesaMeta.by || '?').slice(0, 1).toUpperCase())}</span>
          <span>
            Ultimo aggiornamento di <b>{spesaMeta.by || '?'}</b> · {fmtWhen(spesaMeta.at)}
          </span>
        </div>
      ) : null}

      {categoryManager ? (
        <>
          <div
            className="cat-editor-overlay show"
            onClick={() => setCategoryManager(false)}
          />
          <div className="catman-modal" onClick={(e) => e.stopPropagation()}>
            <div className="catman-head">
              <div className="catman-title">Categorie</div>
              <button className="catman-close" onClick={() => setCategoryManager(false)}>
                ✕
              </button>
            </div>
            <div className="catman-list">
              {cats.map((c) => {
                const [emoji, name] = splitLabel(c.label);
                return (
                  <div className="catman-row" data-key={c.key} key={c.key}>
                    <span
                      className="catman-drag"
                      onPointerDown={(e) => catDragStart(e, c.key)}
                      title="Trascina per riordinare"
                    >
                      ⠿
                    </span>
                    <input
                      className="catman-emoji"
                      maxLength={2}
                      defaultValue={emoji}
                      onBlur={(e) => saveCatInline(c.key, e.currentTarget.value, null)}
                      title="Emoji"
                    />
                    <input
                      className="catman-name"
                      defaultValue={name}
                      onBlur={(e) => saveCatInline(c.key, null, e.currentTarget.value)}
                      placeholder="Nome categoria"
                    />
                    {c.custom ? (
                      <button
                        className="catman-del"
                        onClick={() => deleteCategoryEdit(c.key)}
                        title="Elimina"
                      >
                        ✕
                      </button>
                    ) : (
                      <span className="catman-spacer" />
                    )}
                  </div>
                );
              })}
            </div>
            <button className="catman-add" onClick={managerAddNewCat}>
              + Aggiungi categoria
            </button>
          </div>
        </>
      ) : null}

      {toastMsg ? <div className="sp-toast show">{toastMsg}</div> : null}
    </div>
  );
}
