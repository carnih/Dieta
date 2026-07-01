// ============================================================================
// migrate.mjs — Migrazione dati Firebase RTDB -> Supabase (Fase 2).
// ============================================================================
// One-shot, idempotente su DB VUOTO. Di DEFAULT gira in DRY-RUN (legge Firebase,
// conta cosa inserirebbe, NON scrive). Aggiungi --commit per scrivere davvero.
//
// USO (dalla cartella web/):
//   $env:FB_EMAIL="..."; $env:FB_PASSWORD="..."            # PowerShell
//   $env:SUPABASE_URL="https://fzukrewjcquzxgrpfzaa.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."                   # chiave SEGRETA
//   node scripts/migrate.mjs            # dry-run (nessuna scrittura)
//   node scripts/migrate.mjs --commit   # scrive su Supabase
//
// La service_role BYPASSA la RLS: usarla solo qui, mai nel frontend/repo.
// Per ri-eseguire su un DB già popolato: prima svuota le tabelle (TRUNCATE) —
// vedi supabase/reset.sql.
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const COMMIT = process.argv.includes('--commit');

const FB_APIKEY = 'AIzaSyAIhOcx7IPpTIRjnbbmjhKZ2bWRAjt2JT4'; // pubblica per design
const FB_DBURL = 'https://dieta-b7804-default-rtdb.europe-west1.firebasedatabase.app';

const { FB_EMAIL, FB_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
for (const [k, v] of Object.entries({ FB_EMAIL, FB_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!v) { console.error(`❌ Variabile d'ambiente mancante: ${k}`); process.exit(1); }
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Reference statiche ──────────────────────────────────────────────────────
const CAT_PILL = {
  carbo: '🌾 Carboidrati', prot: '🥩 Proteine', frutta: '🍓 Frutta', latte: '🥛 Latticini',
  grasso: '🥜 Grassi', sfizio: '🍫 Sfizio', verdura: '🥦 Verdura', bevanda: '☕ Bevanda',
  olio: '🫒 Condimento', integra: '💊 Integratore', scegli: '🍽️ Scegli tra', altro: '• Altro',
};
const PROPRIETARI = [
  { key: 'nicholas', tipo: 'persona', nome: 'Nicholas', emoji: '🔵' },
  { key: 'noemi', tipo: 'persona', nome: 'Noemi', emoji: '🩷' },
  { key: 'gatto', tipo: 'animale', nome: 'Mia', emoji: '🐈' },
  { key: 'coniglio', tipo: 'animale', nome: 'Ginger', emoji: '🐰' },
];
const SPESA_CATS_DEFAULT = [
  ['panetteria', '🥖', 'Panetteria', 1], ['cereali', '🌾', 'Cereali', 2], ['dispensa', '🥫', 'Dispensa', 3],
  ['latticini', '🥛', 'Latticini', 4], ['banco', '🥚', 'Banco fresco', 5], ['macelleria', '🥩', 'Macelleria', 6],
  ['pescheria', '🐟', 'Pescheria', 7], ['verdure', '🥦', 'Verdure', 8], ['frutta', '🍓', 'Frutta', 9],
  ['surgelati', '❄️', 'Surgelati', 10], ['integratori', '💊', 'Integratori', 11], ['casa', '🧴', 'Casa', 12],
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const counts = {};
const bump = (t, n = 1) => { counts[t] = (counts[t] || 0) + n; };
const disciplineSet = new Set();

async function fbLogin() {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB_APIKEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: FB_EMAIL, password: FB_PASSWORD, returnSecureToken: true }) });
  const j = await r.json();
  if (!j.idToken) throw new Error('Login Firebase fallito: ' + JSON.stringify(j.error || j));
  return j.idToken;
}
async function fbReadAll(idToken) {
  const r = await fetch(`${FB_DBURL}/.json?auth=${idToken}`);
  if (!r.ok) throw new Error('Lettura Firebase fallita: HTTP ' + r.status);
  return r.json();
}

// insert idempotente-friendly: in dry-run non scrive, in commit inserisce e
// (se `returning`) ritorna le righe con id generati.
async function insert(table, rows, { returning = false } = {}) {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : [rows];
  if (!list.length) return [];
  bump(table, list.length);
  if (!COMMIT) return list.map(() => ({ id: 0 })); // id fittizio in dry-run
  const chunks = [];
  for (let i = 0; i < list.length; i += 500) chunks.push(list.slice(i, i + 500));
  const out = [];
  for (const c of chunks) {
    const q = sb.from(table).insert(c);
    const { data, error } = returning ? await q.select() : await q;
    if (error) throw new Error(`insert ${table}: ${error.message}`);
    if (returning && data) out.push(...data);
  }
  return out;
}
async function insertOne(table, row) {
  return (await insert(table, [row], { returning: true }))[0] || { id: 0 };
}

// ── Domini ──────────────────────────────────────────────────────────────────
async function migRefBase(db) {
  await insert('proprietario', PROPRIETARI);
  const labels = db.catLabels || {};
  await insert('categoria_alimentare',
    Object.keys(CAT_PILL).map((k) => ({ key: k, pill: labels[k] || CAT_PILL[k] })));

  const cats = new Map(SPESA_CATS_DEFAULT.map(([key, emoji, nome, ord]) => [key, { key, emoji, nome, ordinamento: ord, custom: false }]));
  for (const [k, v] of Object.entries(db.spesaCategories || {})) {
    const [emoji, ...rest] = (v.label || k).split(' ');
    cats.set(k, { key: k, emoji, nome: rest.join(' ') || k, ordinamento: v.order || 100, custom: !cats.has(k) });
  }
  // categorie "orfane" usate nei dati ma non definite → aggiunte come custom (evita FK fallita)
  const usate = new Set([...Object.keys(db.spesa || {}), ...(db.pantry || []).map((p) => p?.cat || 'dispensa')]);
  for (const snap of Object.values(db.spesaHistory || {})) for (const k of Object.keys(snap.items || {})) usate.add(k);
  for (const k of usate) if (k && !cats.has(k)) cats.set(k, { key: k, emoji: '📦', nome: k, ordinamento: 200, custom: true });
  await insert('spesa_categoria', [...cats.values()]);
}

// Pre-pass: raccoglie TUTTE le chiavi disciplina usate (schedule + sessioni tri)
// così possiamo inserirle PRIMA delle righe che le referenziano via FK.
function collectDiscipline(db) {
  for (const val of Object.values(db.schedule || {})) {
    const arr = Array.isArray(val) ? val : val ? [val] : [];
    arr.forEach((d) => d && disciplineSet.add(d));
  }
  for (const key of ['forza', 'tri']) {
    const prog = db.allenamentiSchede?.[key];
    for (const w of prog?.weeks || []) for (const s of w.sessioni || []) if (s.disc) disciplineSet.add(s.disc);
  }
}
async function migDiscipline() {
  await insert('disciplina', [...disciplineSet].map((k) => ({ key: k, nome: k[0].toUpperCase() + k.slice(1) })));
}

async function migNicBase(db) {
  const nb = db.nicBase;
  if (!nb || !Array.isArray(nb.days)) return;
  for (const [di, day] of nb.days.entries()) {
    await insert('nic_day', { id: day.id, label: day.label, ordinamento: di, pasto_libero: day.pastoLibero || null });
    const integ = day.integ || {};
    const irows = [];
    if (integ.pre) irows.push({ day_id: day.id, tag: 'Pre', valore: integ.pre, ordinamento: 0 });
    if (integ.post) irows.push({ day_id: day.id, tag: 'Post', valore: integ.post, ordinamento: 1 });
    (integ.multi || []).forEach((m, i) => irows.push({ day_id: day.id, tag: m.tag, valore: m.v, ordinamento: i }));
    await insert('nic_day_integ', irows);
    for (const [pi, p] of (day.pasti || []).entries()) {
      const pasto = await insertOne('nic_pasto', { day_id: day.id, icon: p.icon || null, nome: p.nome, note: p.note || null, ordinamento: pi });
      for (const [ii, it] of (p.items || []).entries()) {
        const item = await insertOne('nic_item', { pasto_id: pasto.id, categoria_key: it.cat, valore: it.alts ? null : (it.v ?? ''), ordinamento: ii });
        if (it.alts) await insert('nic_item_alt', it.alts.map((v, ai) => ({ item_id: item.id, valore: v, ordinamento: ai })));
      }
    }
  }
}

async function migNoemiBase(db) {
  const nb = db.noemiBase;
  if (!nb || typeof nb !== 'object') return;
  let mi = 0;
  for (const [key, m] of Object.entries(nb)) {
    if (!m || !Array.isArray(m.slots)) continue;
    await insert('noemi_meal', { key, icon: m.icon || null, nome: m.nome, ordinamento: mi++ });
    for (const [si, s] of m.slots.entries()) {
      const slot = await insertOne('noemi_slot', { meal_key: key, categoria_key: s.cat, label: s.label, ordinamento: si });
      await insert('noemi_slot_opt', (s.opts || []).map((v, oi) => ({ slot_id: slot.id, valore: v, ordinamento: oi })));
    }
    await insert('noemi_fixed', (m.fixed || []).map((f, fi) => ({ meal_key: key, categoria_key: f.cat, valore: f.v, ordinamento: fi })));
  }
}

async function migNoemiSettimana(db) {
  const ns = db.noemiSettimana || {};
  const rows = [];
  for (const [giorno, meals] of Object.entries(ns)) {
    for (const [chiave, testo] of Object.entries(meals || {})) {
      if (testo && String(testo).trim()) rows.push({ giorno, chiave, testo: String(testo) });
    }
  }
  await insert('noemi_settimana', rows);
}

async function migAllenamenti(db) {
  const sch = db.allenamentiSchede;
  if (!sch) return;
  for (const key of ['forza', 'tri']) {
    const prog = sch[key];
    if (!prog) continue;
    await insert('programma', { key, nome: prog.nome, coach: prog.coach || null, durata: prog.durata ?? null, note: prog.note || null, obiettivi: prog.obiettivi || null });
    for (const [wi, w] of (prog.weeks || []).entries()) {
      const week = await insertOne('programma_week', { programma_key: key, titolo: w.titolo, note: w.note || null, ordinamento: wi });
      const sessioni = w.sessioni
        ? w.sessioni.map((s) => ({ disc: s.disc, nome: s.nome || null, blocchi: s.blocchi || [] }))
        : [{ disc: null, nome: null, blocchi: w.blocchi || [] }]; // forza: blocchi diretti
      for (const [xi, s] of sessioni.entries()) {
        if (s.disc) disciplineSet.add(s.disc);
        const sess = await insertOne('programma_sessione', { week_id: week.id, disc: s.disc, nome: s.nome, ordinamento: xi });
        await insert('programma_blocco', (s.blocchi || []).map((b, bi) => ({ sessione_id: sess.id, nome: b.nome, righe: b.righe || '', ordinamento: bi })));
      }
    }
  }
  const cfg = db.allenamentiCfg || {};
  await insert('allenamenti_cfg', ['forza', 'tri'].filter((k) => cfg[k]).map((k) => ({ programma_key: k, start_date: cfg[k].start || null, shift: cfg[k].shift ?? 0 })));
}

async function migSchedule(db) {
  const s = db.schedule || {};
  const rows = [];
  for (const [giorno, val] of Object.entries(s)) {
    const arr = Array.isArray(val) ? val : val ? [val] : [];
    arr.forEach((disc, i) => { disciplineSet.add(disc); rows.push({ giorno, ordinamento: i, disciplina: disc }); });
  }
  return rows; // inserite dopo le discipline
}

async function migCoach(db) {
  const c = db.coachConfig;
  if (c) await insert('coach_config', { id: true, obiettivo: c.obiettivo || null, note: c.note || null });
}

async function migSpesa(db) {
  for (const [cat, items] of Object.entries(db.spesa || {})) {
    for (const it of items || []) {
      if (!it || !it.t) continue;
      const row = await insertOne('spesa_item', { categoria_key: cat, testo: it.t, preso: !!it.d });
      await insert('spesa_item_proprietario', (it.owners || []).map((o) => ({ item_id: row.id, proprietario_key: o })));
    }
  }
  for (const p of db.pantry || []) {
    if (!p || !p.t) continue;
    const row = await insertOne('dispensa_item', { categoria_key: p.cat || 'dispensa', testo: p.t, attivo: p.active !== false });
    await insert('dispensa_item_proprietario', (p.owners || []).map((o) => ({ dispensa_id: row.id, proprietario_key: o })));
  }
  for (const [ts, snap] of Object.entries(db.spesaHistory || {})) {
    const fatta = snap.date || new Date(Number(ts) || Date.now()).toISOString();
    const storico = await insertOne('spesa_storico', { fatta_il: fatta });
    const voci = [];
    for (const [cat, arr] of Object.entries(snap.items || {})) {
      for (const it of arr || []) if (it && it.t) voci.push({ storico_id: storico.id, categoria_key: cat, testo: it.t });
    }
    await insert('spesa_storico_voce', voci);
  }
  const meta = db.spesaMeta;
  if (meta) await insert('spesa_meta', { id: true, modificato_da: meta.by || null, modificato_il: meta.at ? new Date(meta.at).toISOString() : null });
}

async function migTraining(db) {
  const KNOWN = new Set(['id', 'data', 'mese', 'anno_sett', 'disciplina', 'tipo_garmin', 'nome',
    'durata_min', 'distanza_km', 'fc_media', 'carico', 'ctl', 'atl', 'velocita_bici_kmh',
    'passo_corsa_min_km', 'passo_nuoto_min_100m']);
  const acts = db.training?.activities || {};
  const rows = [];
  for (const [id, a] of Object.entries(acts)) {
    const extra = {};
    for (const [k, v] of Object.entries(a)) if (!KNOWN.has(k)) extra[k] = v;
    rows.push({
      id: a.id || id, data: a.data || null, disciplina: a.disciplina || null, tipo_garmin: a.tipo_garmin || null,
      nome: a.nome || null, durata_min: a.durata_min ?? null, distanza_km: a.distanza_km ?? null,
      fc_media: a.fc_media ?? null, carico: a.carico ?? null, ctl: a.ctl ?? null, atl: a.atl ?? null,
      velocita_bici_kmh: a.velocita_bici_kmh ?? null, passo_corsa_min_km: a.passo_corsa_min_km || null,
      passo_nuoto_min_100m: a.passo_nuoto_min_100m || null, extra: Object.keys(extra).length ? extra : null,
    });
  }
  await insert('attivita', rows); // batch (id naturale)

  const tracks = db.training?.tracks || {};
  const traccia = [], salite = [], laps = [];
  for (const [id, t] of Object.entries(tracks)) {
    traccia.push({ attivita_id: id, versione: t.v ?? null, dislivello_m: t.gain ?? null, geo: t.track ?? null, altimetria: t.elev ?? null });
    (t.climbs || []).forEach((c, i) => salite.push({ attivita_id: id, ordinamento: i,
      durata_s: c.durata_s ?? c.dur ?? null, pendenza_media: c.pend_media ?? c.grad ?? null, pendenza_max: c.pend_max ?? null,
      fc_media: c.fc ?? null, cadenza: c.cad ?? null, vam: c.vam ?? null, velocita: c.vel ?? null }));
    (t.laps || []).forEach((l, i) => laps.push({ attivita_id: id, ordinamento: i,
      distanza_km: l.km ?? l.dist ?? null, durata_s: l.durata_s ?? l.dur ?? null, passo: l.passo ?? null, velocita: l.vel ?? null }));
  }
  await insert('traccia', traccia);
  await insert('traccia_salita', salite);
  await insert('traccia_lap', laps);
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n== Migrazione Firebase → Supabase (${COMMIT ? 'COMMIT' : 'DRY-RUN'}) ==\n`);
  console.log('· login Firebase…');
  const db = await fbReadAll(await fbLogin());
  console.log('· dati letti. Trasformo…\n');

  collectDiscipline(db);          // raccoglie le discipline usate…
  await migRefBase(db);
  await migDiscipline();          // …e le inserisce PRIMA delle FK che le referenziano
  await migNicBase(db);
  await migNoemiBase(db);
  await migNoemiSettimana(db);
  await migAllenamenti(db);       // programma_sessione.disc → disciplina (già presenti)
  const scheduleRows = await migSchedule(db);
  await insert('schedule_giorno', scheduleRows); // schedule_giorno.disciplina → disciplina
  await migCoach(db);
  await migSpesa(db);
  await migTraining(db);

  console.log('Righe ' + (COMMIT ? 'inserite' : 'da inserire') + ' per tabella:');
  for (const t of Object.keys(counts).sort()) console.log(`  ${t.padEnd(28)} ${counts[t]}`);
  console.log(`\n✔ ${COMMIT ? 'Migrazione completata.' : 'DRY-RUN completato (nessuna scrittura). Rilancia con --commit per scrivere.'}\n`);
})().catch((e) => { console.error('\n❌ ERRORE:', e.message, '\n'); process.exit(1); });
