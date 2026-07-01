// SupabaseRepo — implementazione del Repo su Supabase (Postgres normalizzato 3NF).
//
// FASE READS: auth + tutte le LETTURE (ricostruiscono i blob JSON che l'app si
// aspetta, identici a Firebase) + realtime (best-effort). Le SCRITTURE arrivano
// nel giro successivo, dopo aver verificato le letture in locale → per ora `set`
// lancia un errore chiaro (collaudo in sola lettura, dati al sicuro).

import type { RealtimeChannel } from '@supabase/supabase-js';
import type { AuthUser, Repo } from '@/data/repo';
import { requireSupabase } from '@/lib/supabase';

// pill di default (per catLabels) — coerenti con lib/dietData CAT.
const CAT_PILL_DEFAULT: Record<string, string> = {
  carbo: '🌾 Carboidrati', prot: '🥩 Proteine', frutta: '🍓 Frutta', latte: '🥛 Latticini',
  grasso: '🥜 Grassi', sfizio: '🍫 Sfizio', verdura: '🥦 Verdura', bevanda: '☕ Bevanda',
  olio: '🫒 Condimento', integra: '💊 Integratore', scegli: '🍽️ Scegli tra', altro: '• Altro',
};

// Tabelle da osservare in realtime per ciascun nodo (best-effort).
const WATCH: Record<string, string[]> = {
  'training/activities': ['attivita'],
  schedule: ['schedule_giorno'],
  coachConfig: ['coach_config'],
  spesaMeta: ['spesa_meta'],
  nicBase: ['nic_day', 'nic_pasto', 'nic_item', 'nic_item_alt', 'nic_day_integ'],
  noemiBase: ['noemi_meal', 'noemi_slot', 'noemi_slot_opt', 'noemi_fixed'],
  noemiSettimana: ['noemi_settimana'],
  allenamentiCfg: ['allenamenti_cfg'],
  catLabels: ['categoria_alimentare'],
  spesa: ['spesa_item', 'spesa_item_proprietario'],
  spesaCategories: ['spesa_categoria'],
  spesaHistory: ['spesa_storico', 'spesa_storico_voce'],
  pantry: ['dispensa_item', 'dispensa_item_proprietario'],
  overrides: ['override_pasto'],
  allenamentiSchede: ['programma', 'programma_week', 'programma_sessione', 'programma_blocco'],
};

export class SupabaseRepo implements Repo {
  // risolto alla costruzione (non all'import) → importare il modulo è sempre sicuro.
  private sb = requireSupabase();
  // stato per nodo (chiave = 1° segmento del path) per l'optimistic UI: callback
  // dei subscriber, ultimo valore noto, e refetch (debounced) per riconciliare.
  private nodeCbs = new Map<string, Set<(v: unknown) => void>>();
  private nodeVal = new Map<string, unknown>();
  private nodeRefetch = new Map<string, () => void>();

  onAuthChange(cb: (user: AuthUser | null) => void): () => void {
    this.sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      cb(u ? { uid: u.id, email: u.email ?? null } : null);
    });
    const { data } = this.sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      cb(u ? { uid: u.id, email: u.email ?? null } : null);
    });
    return () => data.subscription.unsubscribe();
  }

  async login(email: string, password: string): Promise<void> {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async logout(): Promise<void> {
    await this.sb.auth.signOut();
  }

  subscribe(path: string, cb: (val: unknown) => void): () => void {
    const node = path.split('/')[0];
    let cbs = this.nodeCbs.get(node);
    if (!cbs) { cbs = new Set(); this.nodeCbs.set(node, cbs); }
    cbs.add(cb);
    let alive = true;
    const emit = (v: unknown) => { this.nodeVal.set(node, v); this.nodeCbs.get(node)?.forEach((f) => f(v)); };
    const refetch = () => this.get(path).then((v) => { if (alive) emit(v); }).catch((e) => {
      console.error('SupabaseRepo read', path, e);
      if (alive) emit(null);
    });
    // debounce: un bulk (delete+insert di N righe) genera N eventi realtime → una sola rilettura.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => void refetch(), 60); };
    this.nodeRefetch.set(node, bump);
    void refetch();
    let ch: RealtimeChannel | null = null;
    const tables = WATCH[path];
    if (tables) {
      ch = this.sb.channel('rt:' + path);
      for (const t of tables) {
        ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, bump);
      }
      ch.subscribe();
    }
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      cbs.delete(cb);
      if (ch) void this.sb.removeChannel(ch);
    };
  }

  async get<T = unknown>(path: string): Promise<T | null> {
    return (await this.readNode(path)) as T | null;
  }

  // ── Scritture: traduce il path Firebase-style nell'operazione SQL ──────────
  async set(path: string, val: unknown): Promise<void> {
    this.optimistic(path, val); // UI aggiornata SUBITO (istantaneo), poi persiste in background
    try {
      await this.apply(path, val);
    } catch (e) {
      console.error('SupabaseRepo set', path, e);
      this.nodeRefetch.get(path.split('/')[0])?.(); // errore → riallinea alla verità dal DB
      throw e;
    }
  }

  // emette ottimisticamente il nuovo valore del nodo ai subscriber (merge nel path).
  private optimistic(path: string, val: unknown): void {
    const seg = path.split('/');
    const node = seg[0];
    const cbs = this.nodeCbs.get(node);
    if (!cbs || !cbs.size) return;
    let nv: unknown;
    if (seg.length === 1) {
      nv = val;
    } else {
      const base = clone(this.nodeVal.get(node));
      nv = base && typeof base === 'object' ? base : {};
      setPath(nv as Record<string, unknown>, seg.slice(1), val);
    }
    this.nodeVal.set(node, nv);
    cbs.forEach((f) => f(nv));
  }

  private async apply(path: string, val: unknown): Promise<void> {
    const s = path.split('/');
    switch (s[0]) {
      case 'nicBase': return this.wNicBase(val as NicDiet);
      case 'noemiBase': return this.wNoemiBase(val as Record<string, NoemiMealW>);
      case 'allenamentiSchede': return this.wSchede(val as Record<string, ProgW>);
      case 'noemiSettimana': return this.wNoemiSett(s[1], s[2], val);
      case 'allenamentiCfg': return this.wCfg(s[1], val as { start?: string; shift?: number });
      case 'schedule': return s[1] ? this.wSchedDay(s[1], val as string[] | null) : this.delAll('schedule_giorno');
      case 'catLabels': return this.wCatLabel(s[1], val as string | null);
      case 'coachConfig': return this.wCoach(val as string | null); // .../obiettivo
      case 'spesaMeta': return this.wSpesaMeta(val as { by?: string; at?: number });
      case 'spesa': return s[1] ? this.wSpesaCat(s[1], val as ItemW[] | null) : this.wSpesaAll(val as Record<string, ItemW[]> | null);
      case 'pantry': return this.wPantry(val as PantryW[] | null);
      case 'spesaHistory': return s[1] ? this.wHistAdd(val as HistW) : this.delAll('spesa_storico');
      case 'spesaCategories': return this.wSpesaCat2(s[1], val as { label?: string; order?: number } | null);
      case 'overrides': return this.wOverride(s[1], s[2], val as { e?: boolean; n?: boolean } | null);
      case 'schedePdf': console.warn('SupabaseRepo: schedePdf (Storage) non ancora implementato'); return;
      default: console.warn('SupabaseRepo: set path non gestito', path);
    }
  }

  // helper scrittura
  private async ins(table: string, rows: R[]): Promise<void> {
    if (!rows.length) return;
    const { error } = await this.sb.from(table).insert(rows);
    if (error) throw error;
  }
  private async insOne(table: string, row: R): Promise<number> {
    const { data, error } = await this.sb.from(table).insert(row).select('id').single();
    if (error) throw error;
    return (data as { id: number }).id;
  }
  private async up(table: string, row: R, onConflict?: string): Promise<void> {
    const { error } = await this.sb.from(table).upsert(row, onConflict ? { onConflict } : undefined);
    if (error) throw error;
  }
  private async delAll(table: string): Promise<void> {
    const { error } = await this.sb.from(table).delete().gte('created_at', '1900-01-01');
    if (error) throw error;
  }
  private async delEq(table: string, col: string, v: string): Promise<void> {
    const { error } = await this.sb.from(table).delete().eq(col, v);
    if (error) throw error;
  }
  private async ensureDisc(k: string): Promise<void> {
    await this.up('disciplina', { key: k, nome: k[0].toUpperCase() + k.slice(1) }, 'key');
  }

  private async wNicBase(val: NicDiet): Promise<void> {
    await this.delAll('nic_day'); // cascade: pasto/item/alt/integ
    for (const [di, day] of (val?.days || []).entries()) {
      await this.ins('nic_day', [{ id: day.id, label: day.label || day.id, ordinamento: di, pasto_libero: day.pastoLibero || null }]);
      const ig = day.integ || {}, irows: R[] = [];
      if (ig.pre) irows.push({ day_id: day.id, tag: 'Pre', valore: ig.pre, ordinamento: 0 });
      if (ig.post) irows.push({ day_id: day.id, tag: 'Post', valore: ig.post, ordinamento: 1 });
      (ig.multi || []).forEach((m, i) => { if (m.v && m.tag) irows.push({ day_id: day.id, tag: m.tag, valore: m.v, ordinamento: i }); });
      await this.ins('nic_day_integ', irows);
      for (const [pi, p] of (day.pasti || []).entries()) {
        const pid = await this.insOne('nic_pasto', { day_id: day.id, icon: p.icon || null, nome: p.nome || '—', note: p.note || null, ordinamento: pi });
        for (const [ii, it] of (p.items || []).entries()) {
          const iid = await this.insOne('nic_item', { pasto_id: pid, categoria_key: it.cat, valore: it.alts ? null : (it.v ?? ''), ordinamento: ii });
          if (it.alts) await this.ins('nic_item_alt', it.alts.filter((v) => v && v.trim()).map((v, ai) => ({ item_id: iid, valore: v, ordinamento: ai })));
        }
      }
    }
  }

  private async wNoemiBase(val: Record<string, NoemiMealW>): Promise<void> {
    await this.delAll('noemi_meal'); // cascade: slot/opt/fixed
    let mi = 0;
    for (const [key, m] of Object.entries(val || {})) {
      if (!m || !Array.isArray(m.slots)) continue;
      await this.ins('noemi_meal', [{ key, icon: m.icon || null, nome: m.nome || key, ordinamento: mi++ }]);
      for (const [si, s] of m.slots.entries()) {
        const sid = await this.insOne('noemi_slot', { meal_key: key, categoria_key: s.cat, label: s.label || '—', ordinamento: si });
        await this.ins('noemi_slot_opt', (s.opts || []).filter((v) => v && v.trim()).map((v, oi) => ({ slot_id: sid, valore: v, ordinamento: oi })));
      }
      await this.ins('noemi_fixed', (m.fixed || []).filter((f) => f.v && f.v.trim()).map((f, fi) => ({ meal_key: key, categoria_key: f.cat, valore: f.v, ordinamento: fi })));
    }
  }

  private async wSchede(val: Record<string, ProgW>): Promise<void> {
    for (const key of ['forza', 'tri']) {
      const prog = val?.[key];
      if (!prog) continue;
      await this.up('programma', { key, nome: prog.nome || key, coach: prog.coach || null, durata: prog.durata ?? null, note: prog.note || null, obiettivi: prog.obiettivi || null }, 'key');
      await this.delEq('programma_week', 'programma_key', key); // cascade: sessione/blocco
      for (const [wi, w] of (prog.weeks || []).entries()) {
        const wid = await this.insOne('programma_week', { programma_key: key, titolo: w.titolo || `Settimana ${wi + 1}`, note: w.note || null, ordinamento: wi });
        const sessioni = w.sessioni ? w.sessioni.map((x) => ({ disc: x.disc, nome: x.nome || null, blocchi: x.blocchi || [] })) : [{ disc: null, nome: null, blocchi: w.blocchi || [] }];
        for (const [xi, x] of sessioni.entries()) {
          if (x.disc) await this.ensureDisc(x.disc);
          const sid = await this.insOne('programma_sessione', { week_id: wid, disc: x.disc, nome: x.nome, ordinamento: xi });
          await this.ins('programma_blocco', (x.blocchi || []).map((b, bi) => ({ sessione_id: sid, nome: b.nome || '—', righe: b.righe || '', ordinamento: bi })));
        }
      }
    }
  }

  private async wNoemiSett(wd: string, mk: string, val: unknown): Promise<void> {
    if (val == null || val === '') { await this.sb.from('noemi_settimana').delete().eq('giorno', wd).eq('chiave', mk); return; }
    await this.up('noemi_settimana', { giorno: wd, chiave: mk, testo: String(val) }, 'giorno,chiave');
  }

  private async wCfg(prog: string, val: { start?: string; shift?: number }): Promise<void> {
    await this.up('allenamenti_cfg', { programma_key: prog, start_date: val?.start || null, shift: val?.shift ?? 0 }, 'programma_key');
  }

  private async wSchedDay(wd: string, val: string[] | null): Promise<void> {
    await this.delEq('schedule_giorno', 'giorno', wd);
    if (Array.isArray(val)) {
      for (const d of val) await this.ensureDisc(d);
      await this.ins('schedule_giorno', val.map((d, i) => ({ giorno: wd, ordinamento: i, disciplina: d })));
    }
  }

  private async wCatLabel(cat: string, val: string | null): Promise<void> {
    const { error } = await this.sb.from('categoria_alimentare').update({ pill: val || CAT_PILL_DEFAULT[cat] || cat }).eq('key', cat);
    if (error) throw error;
  }

  private async wCoach(val: string | null): Promise<void> {
    await this.up('coach_config', { id: true, obiettivo: val || null }, 'id');
  }

  private async wSpesaMeta(val: { by?: string; at?: number }): Promise<void> {
    await this.up('spesa_meta', { id: true, modificato_da: val?.by || null, modificato_il: val?.at ? new Date(val.at).toISOString() : null }, 'id');
  }

  private async wSpesaCat(cat: string, val: ItemW[] | null): Promise<void> {
    const { error } = await this.sb.rpc('replace_spesa_categoria', { p_cat: cat, p_items: val });
    if (error) throw error;
  }
  private async wSpesaAll(val: Record<string, ItemW[]> | null): Promise<void> {
    const { error } = await this.sb.rpc('replace_spesa_all', { p_spesa: val });
    if (error) throw error;
  }

  private async wPantry(val: PantryW[] | null): Promise<void> {
    const { error } = await this.sb.rpc('replace_pantry', { p_items: val });
    if (error) throw error;
  }

  private async wHistAdd(val: HistW): Promise<void> {
    const sid = await this.insOne('spesa_storico', { fatta_il: histIso(val?.date) });
    const voci: R[] = [];
    for (const [cat, arr] of Object.entries(val?.items || {})) for (const it of arr || []) if (it?.t) voci.push({ storico_id: sid, categoria_key: cat, testo: it.t });
    await this.ins('spesa_storico_voce', voci);
  }

  private async wSpesaCat2(key: string, val: { label?: string; order?: number } | null): Promise<void> {
    if (val == null) {
      await this.delEq('spesa_item', 'categoria_key', key); // prima gli articoli (FK)
      await this.delEq('spesa_categoria', 'key', key);
      return;
    }
    const [emoji, ...rest] = String(val.label || key).split(' ');
    await this.up('spesa_categoria', { key, emoji, nome: rest.join(' ') || key, ordinamento: val.order || 100, custom: true }, 'key');
  }

  private async wOverride(date: string, meal: string, val: { e?: boolean; n?: boolean } | null): Promise<void> {
    const { error } = await this.sb.rpc('set_override', { p_data: date, p_pasto: meal, p_val: val });
    if (error) throw error;
  }

  // ── Ricostruzione dei nodi (blob JSON identici a Firebase) ──────────────────
  private async readNode(path: string): Promise<unknown> {
    switch (path) {
      case 'training/activities': return this.rTrainingActivities();
      case 'schedule': return this.rSchedule();
      case 'coachConfig': return this.rCoachConfig();
      case 'spesaMeta': return this.rSpesaMeta();
      case 'nicBase': return this.rNicBase();
      case 'noemiBase': return this.rNoemiBase();
      case 'noemiSettimana': return this.rNoemiSettimana();
      case 'allenamentiCfg': return this.rAllenamentiCfg();
      case 'catLabels': return this.rCatLabels();
      case 'spesa': return this.rSpesa();
      case 'spesaCategories': return this.rSpesaCategories();
      case 'spesaHistory': return this.rSpesaHistory();
      case 'pantry': return this.rPantry();
      case 'overrides': return this.rOverrides();
      case 'allenamentiSchede': return this.rAllenamentiSchede();
      default:
        if (path.startsWith('training/tracks/')) return this.rTrack(path.split('/')[2]);
        console.warn('SupabaseRepo: readNode path non gestito', path);
        return null;
    }
  }

  private async rows<T = Record<string, unknown>>(table: string, cols = '*', order?: string): Promise<T[]> {
    let q = this.sb.from(table).select(cols);
    if (order) q = q.order(order);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as T[];
  }

  private async rTrainingActivities() {
    const acts = await this.rows('attivita');
    const out: Record<string, unknown> = {};
    for (const a of acts as Record<string, unknown>[]) {
      const { extra, created_at, updated_at, ...cols } = a;
      out[String(a.id)] = { ...cols, ...(extra && typeof extra === 'object' ? extra : {}) };
    }
    return out;
  }

  private async rTrack(id: string) {
    const [tr] = await this.rows('traccia', '*', undefined).then((r) => (r as Record<string, unknown>[]).filter((x) => x.attivita_id === id));
    if (!tr) return null;
    const salite = (await this.rows('traccia_salita', '*', 'ordinamento')).filter((x: Record<string, unknown>) => x.attivita_id === id);
    const laps = (await this.rows('traccia_lap', '*', 'ordinamento')).filter((x: Record<string, unknown>) => x.attivita_id === id);
    return { v: tr.versione, gain: tr.dislivello_m, track: tr.geo, elev: tr.altimetria, climbs: salite, laps };
  }

  private async rSchedule() {
    const rs = await this.rows<{ giorno: string; ordinamento: number; disciplina: string }>('schedule_giorno', 'giorno,ordinamento,disciplina', 'ordinamento');
    const out: Record<string, string[]> = {};
    for (const r of rs) (out[r.giorno] ??= []).push(r.disciplina);
    return out;
  }

  private async rCoachConfig() {
    const [c] = await this.rows<{ obiettivo: string | null; note: string | null }>('coach_config');
    return c ? { obiettivo: c.obiettivo ?? undefined, note: c.note ?? undefined } : {};
  }

  private async rSpesaMeta() {
    const [m] = await this.rows<{ modificato_da: string | null; modificato_il: string | null }>('spesa_meta');
    if (!m) return null;
    return { by: m.modificato_da ?? undefined, at: m.modificato_il ? Date.parse(m.modificato_il) : undefined };
  }

  private async rCatLabels() {
    const rs = await this.rows<{ key: string; pill: string }>('categoria_alimentare', 'key,pill');
    const out: Record<string, string> = {};
    for (const r of rs) if (r.pill && r.pill !== CAT_PILL_DEFAULT[r.key]) out[r.key] = r.pill;
    return out;
  }

  private async rNicBase() {
    const days = await this.rows('nic_day', '*', 'ordinamento');
    const [integ, pasti, items, alts] = await Promise.all([
      this.rows('nic_day_integ', '*', 'ordinamento'), this.rows('nic_pasto', '*', 'ordinamento'),
      this.rows('nic_item', '*', 'ordinamento'), this.rows('nic_item_alt', '*', 'ordinamento'),
    ]);
    const altBy = groupBy(alts as R[], 'item_id');
    const itemsBy = groupBy(items as R[], 'pasto_id');
    const pastiBy = groupBy(pasti as R[], 'day_id');
    const integBy = groupBy(integ as R[], 'day_id');
    return {
      days: (days as R[]).map((d) => ({
        id: d.id, label: d.label, pastoLibero: d.pasto_libero || undefined,
        integ: rebuildInteg((integBy[String(d.id)] || [])),
        pasti: (pastiBy[String(d.id)] || []).map((p) => ({
          icon: p.icon || '', nome: p.nome, note: p.note || undefined,
          items: (itemsBy[String(p.id)] || []).map((it) => {
            const a = (altBy[String(it.id)] || []).map((x) => x.valore);
            return a.length ? { cat: it.categoria_key, alts: a } : { cat: it.categoria_key, v: it.valore ?? '' };
          }),
        })),
      })),
    };
  }

  private async rNoemiBase() {
    const [meals, slots, opts, fixed] = await Promise.all([
      this.rows('noemi_meal', '*', 'ordinamento'), this.rows('noemi_slot', '*', 'ordinamento'),
      this.rows('noemi_slot_opt', '*', 'ordinamento'), this.rows('noemi_fixed', '*', 'ordinamento'),
    ]);
    const optBy = groupBy(opts as R[], 'slot_id');
    const slotBy = groupBy(slots as R[], 'meal_key');
    const fixBy = groupBy(fixed as R[], 'meal_key');
    const out: Record<string, unknown> = {};
    for (const m of meals as R[]) {
      out[String(m.key)] = {
        icon: m.icon || '', nome: m.nome,
        slots: (slotBy[String(m.key)] || []).map((s) => ({
          key: String(s.id), cat: s.categoria_key, label: s.label,
          opts: (optBy[String(s.id)] || []).map((o) => o.valore),
        })),
        fixed: (fixBy[String(m.key)] || []).map((f) => ({ cat: f.categoria_key, v: f.valore })),
      };
    }
    return out;
  }

  private async rNoemiSettimana() {
    const rs = await this.rows<{ giorno: string; chiave: string; testo: string }>('noemi_settimana');
    const out: Record<string, Record<string, string>> = {};
    for (const r of rs) (out[r.giorno] ??= {})[r.chiave] = r.testo;
    return out;
  }

  private async rAllenamentiCfg() {
    const rs = await this.rows<{ programma_key: string; start_date: string | null; shift: number }>('allenamenti_cfg');
    const out: Record<string, unknown> = {};
    for (const r of rs) out[r.programma_key] = { start: r.start_date || undefined, shift: r.shift };
    return out;
  }

  private async rSpesa() {
    const [items, owners] = await Promise.all([
      this.rows('spesa_item'), this.rows('spesa_item_proprietario'),
    ]);
    const ownBy = groupBy(owners as R[], 'item_id');
    const out: Record<string, unknown[]> = {};
    for (const it of items as R[]) {
      (out[String(it.categoria_key)] ??= []).push({
        t: it.testo, d: !!it.preso,
        owners: (ownBy[String(it.id)] || []).map((o) => o.proprietario_key),
      });
    }
    return out;
  }

  private async rSpesaCategories() {
    const rs = await this.rows<{ key: string; emoji: string | null; nome: string; ordinamento: number }>('spesa_categoria');
    const out: Record<string, unknown> = {};
    for (const r of rs) out[r.key] = { label: [r.emoji, r.nome].filter(Boolean).join(' '), order: r.ordinamento };
    return out;
  }

  private async rSpesaHistory() {
    const [storici, voci] = await Promise.all([this.rows('spesa_storico'), this.rows('spesa_storico_voce')]);
    const vBy = groupBy(voci as R[], 'storico_id');
    const out: Record<string, unknown> = {};
    for (const s of storici as R[]) {
      const items: Record<string, unknown[]> = {};
      for (const v of vBy[String(s.id)] || []) (items[String(v.categoria_key || 'altro')] ??= []).push({ t: v.testo });
      out[String(s.id)] = { date: s.fatta_il, items };
    }
    return out;
  }

  private async rPantry() {
    const [items, owners] = await Promise.all([this.rows('dispensa_item'), this.rows('dispensa_item_proprietario')]);
    const ownBy = groupBy(owners as R[], 'dispensa_id');
    return (items as R[]).map((p) => ({
      t: p.testo, cat: p.categoria_key, active: !!p.attivo,
      owners: (ownBy[String(p.id)] || []).map((o) => o.proprietario_key),
    }));
  }

  private async rOverrides() {
    const rs = await this.rows<{ data: string; pasto: string; persona: string }>('override_pasto');
    const out: Record<string, Record<string, Record<string, boolean>>> = {};
    for (const r of rs) (((out[r.data] ??= {})[r.pasto] ??= {}))[r.persona] = true;
    return out;
  }

  private async rAllenamentiSchede() {
    const [progs, weeks, sess, blocchi] = await Promise.all([
      this.rows('programma'), this.rows('programma_week', '*', 'ordinamento'),
      this.rows('programma_sessione', '*', 'ordinamento'), this.rows('programma_blocco', '*', 'ordinamento'),
    ]);
    const blocBy = groupBy(blocchi as R[], 'sessione_id');
    const sessBy = groupBy(sess as R[], 'week_id');
    const weekBy = groupBy(weeks as R[], 'programma_key');
    const out: Record<string, unknown> = {};
    for (const p of progs as R[]) {
      out[String(p.key)] = {
        nome: p.nome, coach: p.coach || '', durata: p.durata ?? 0, note: p.note || undefined, obiettivi: p.obiettivi || undefined,
        weeks: (weekBy[String(p.key)] || []).map((w) => {
          const ss = sessBy[String(w.id)] || [];
          const week: Record<string, unknown> = { titolo: w.titolo, note: w.note || undefined };
          if (ss.length === 1 && ss[0].disc == null) {
            week.blocchi = (blocBy[String(ss[0].id)] || []).map((b) => ({ nome: b.nome, righe: b.righe }));
          } else {
            week.sessioni = ss.map((s) => ({ disc: s.disc, nome: s.nome || undefined, blocchi: (blocBy[String(s.id)] || []).map((b) => ({ nome: b.nome, righe: b.righe })) }));
          }
          return week;
        }),
      };
    }
    return out;
  }
}

// ── util ──
type R = Record<string, unknown>;

// tipi minimi delle scritture (shape lato app)
type ItemW = { t: string; d?: boolean; owners?: string[] };
type PantryW = { t: string; cat?: string; active?: boolean; owners?: string[] };
type HistW = { date?: string; items?: Record<string, ItemW[]> };
type NoemiMealW = { icon?: string; nome?: string; slots?: { cat: string; label?: string; opts?: string[] }[]; fixed?: { cat: string; v?: string }[] };
type BloccoW = { nome?: string; righe?: string };
type SessW = { disc?: string | null; nome?: string; blocchi?: BloccoW[] };
type WeekW = { titolo?: string; note?: string; blocchi?: BloccoW[]; sessioni?: SessW[] };
type ProgW = { nome?: string; coach?: string; durata?: number; note?: string; obiettivi?: string; weeks?: WeekW[] };
type NicItemW = { cat: string; v?: string; alts?: string[] };
type NicPastoW = { icon?: string; nome?: string; note?: string; items?: NicItemW[] };
type NicDayW = { id: string; label?: string; pastoLibero?: string; integ?: { pre?: string; post?: string; multi?: { tag: string; v: string }[] }; pasti?: NicPastoW[] };
type NicDiet = { days?: NicDayW[] };

function clone<T>(x: T): T {
  return x == null ? x : (JSON.parse(JSON.stringify(x)) as T);
}
// imposta (o cancella se val==null) il valore alla path annidata dentro obj.
function setPath(obj: Record<string, unknown>, segs: string[], val: unknown): void {
  let o = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const k = segs[i];
    if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
    o = o[k] as Record<string, unknown>;
  }
  const last = segs[segs.length - 1];
  if (val == null) delete o[last];
  else o[last] = val;
}

function histIso(date?: string): string {
  if (!date) return new Date().toISOString();
  const m = String(date).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(date);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function groupBy(rows: R[], key: string): Record<string, R[]> {
  const out: Record<string, R[]> = {};
  for (const r of rows) (out[String(r[key])] ??= []).push(r);
  return out;
}
function rebuildInteg(rows: R[]): unknown {
  if (!rows.length) return undefined;
  const pre = rows.find((r) => r.tag === 'Pre');
  const post = rows.find((r) => r.tag === 'Post');
  const multi = rows.filter((r) => r.tag !== 'Pre' && r.tag !== 'Post');
  if (multi.length) return { multi: rows.map((r) => ({ tag: r.tag, v: r.valore })) };
  return { pre: pre?.valore, post: post?.valore };
}
