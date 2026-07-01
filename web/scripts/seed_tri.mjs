// seed_tri.mjs — carica su Supabase il programma TRIATHLON di luglio (Mesociclo 9,
// PT Paolo Morosini), fedele al PDF. SOSTITUISCE le settimane del programma 'tri'
// (upsert programma + replace week/sessione/blocco). NON tocca altri dati.
//
// USO (da web/, stesse env della migrazione):
//   $env:SUPABASE_URL="https://fzukrewjcquzxgrpfzaa.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="...service_role..."
//   node scripts/seed_tri.mjs
import { createClient } from '@supabase/supabase-js';
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Sessioni per settimana: 2 nuoti (mar+ven), 2 bici (mer+sab), 1 run (gio), 1 brick (dom).
const B = (nome, righe) => ({ nome, righe });
const WEEKS = [
  { titolo: 'Settimana 1', sessioni: [
    { disc: 'nuoto', nome: 'Nuoto (mar) · Tecnica e forza — 2400 m', blocchi: [
      B('Riscaldamento', '300 SL easy · rest libero\n4×50 tecnica · rest 20"\n4×50 gambe con tavoletta · rest 30"\n4×50 pull buoy · rest 20"'),
      B('Main set', '8×100 brillante (buon ritmo) · rec 20"\n8×50 con pinnette progressivi · rest 20/30"\n200 defaticamento (facoltativo)') ] },
    { disc: 'bici', nome: 'Bici (mer) · Sviluppo della soglia', blocchi: [
      B('Lavoro', "20' riscaldamento\n4×8' @ PE8 · rec 4'\n10' rapporto agile, obiettivo 95-100 rpm\n10' defaticamento") ] },
    { disc: 'corsa', nome: 'Run (gio) · Ritmo gara', blocchi: [
      B('Lavoro', "15' facili\n3×10' a ritmo 70.3 (cerca di stare al ritmo olimpico) · rec 3' corsa lenta\n10' facili") ] },
    { disc: 'nuoto', nome: 'Nuoto (ven) · Ritmo gara — 2600 m', blocchi: [
      B('Riscaldamento', '200 easy · recupero libero\n4×100 pull (se sposti a sabato, togli)'),
      B('Main', '3×500 ritmo gara · rec 45"\n6×100 leggermente più veloci del ritmo gara · rest 1\'\n100 easy (se sposti a sabato, togli)'),
      B('Nota', 'Eventualmente sposti a sabato mattina o pomeriggio post bici.') ] },
    { disc: 'bici', nome: 'Bici (sab) · Endurance', blocchi: [
      B('Lavoro', "30' RPE5\n3×20' @ RPE7 · rec 5'\n20' RPE6\nNegli ultimi 15': rapporto più agile, 90-95 rpm") ] },
    { disc: 'brick', nome: 'Brick (dom)', blocchi: [
      B('Bike — 1h45', "RPE6 costante\nUltimi 20': RPE7\nTransizione immediata"),
      B('Run — 35\'', "20' ritmo gara (olimpico) + 15' facili") ] },
  ] },
  { titolo: 'Settimana 2', sessioni: [
    { disc: 'nuoto', nome: 'Nuoto (mar)', blocchi: [
      B('Variazioni vs sett.1', 'Main set a 10×100 m (rec 20")\n2° set: 10×50 m con pinnette (alternando ritmo gara olimpico e progressivo)') ] },
    { disc: 'bici', nome: 'Bici (mer) — 1h35', blocchi: [
      B('Lavoro', "Warm-up invariato\n5×8' @ PE8 · rec attivo 4'\nParte finale: 12' alta cadenza (95-100 rpm)") ] },
    { disc: 'corsa', nome: 'Run (gio) — 60\'', blocchi: [
      B('Lavoro', "Warm-up uguale, poi\n3×12' @ 5'45\"-5'50\"/km · rec attivo 3'\nCorsa easy ad arrivare all'ora di lavoro") ] },
    { disc: 'nuoto', nome: 'Nuoto (ven)', blocchi: [
      B('Lavoro', 'Main set: 4×500 m @ ritmo gara · rec 45" (togli un blocco se sposti a sabato)\nChiusura: 6×100 m (alternando uno forte e uno lento)') ] },
    { disc: 'bici', nome: 'Bici (sab) · Durability', blocchi: [
      B('Lavoro', "30' PE5\n3×25' @ PE7 · rec attivo 5'\n10' a 60 rpm\n10' a 95 rpm\n15' RPE6") ] },
    { disc: 'brick', nome: 'Brick (dom)', blocchi: [
      B('Bike — 2h', "20' PE5\n70' PE6\n25' PE7\n5' easy"),
      B('Run — 40\'', "10' @ 6'05\"\n20' @ 5'50\"\n10' forte (ritmo a scelta)") ] },
  ] },
  { titolo: 'Settimana 3 · picco di carico', sessioni: [
    { disc: 'nuoto', nome: 'Nuoto (mar)', blocchi: [
      B('Lavoro', '300 SL · recupero libero\n100 dorso\n4×50 tecnica · rest 20" (focus allungamento, respirazione, dettagli tecnici)\n4×50 tavoletta · rest 40"\n4×50 pull · rest 30"\n12×100 m CSS · rec 20"\n8×50 m con pinnette progressivi · rest libero\n200 easy') ] },
    { disc: 'bici', nome: 'Bici (mer) — 1h40', blocchi: [
      B('Lavoro', "Warm-up 15-20'\n3×12' @ PE8 · rec attivo 5'\n10' alta cadenza\nCool-down a chiudere 1h40") ] },
    { disc: 'corsa', nome: 'Run (gio)', blocchi: [
      B('Lavoro', "Tecnica di corsa come riscaldamento: andature varie 10' almeno\n2×20' @ 5'30\"-5'45\"/km · rec 5' corsa lenta\nDefaticamento") ] },
    { disc: 'nuoto', nome: 'Nuoto (ven)', blocchi: [
      B('Lavoro', 'Main set: 2×1000 m @ ritmo gara · rec 1\'\n8×50 con pinnette brillanti (se sposti a sabato, dimezza)\nDefaticamento 200 m (se sposti a sabato, togli)') ] },
    { disc: 'bici', nome: 'Bici (sab) · Durability', blocchi: [
      B('Lavoro', "30' PE5\n2×35' @ PE7 · 5' easy bike tra i blocchi\n10' bassa cadenza (60 rpm)\n10' alta cadenza (95 rpm)\n20' PE6") ] },
    { disc: 'brick', nome: 'Brick lungo (dom)', blocchi: [
      B('Bike', "25' PE5\n80' PE6\n25' PE7\n5' easy"),
      B('Run — 45\'', "10' @ 6'00\"\n20' @ 5'50\"\n15' forte") ] },
  ] },
  { titolo: 'Settimana 4 · scarico attivo', sessioni: [
    { disc: 'nuoto', nome: 'Nuoto (mar)', blocchi: [ B('Lavoro', '1900 m ritmo easy') ] },
    { disc: 'bici', nome: 'Bici (mer) — 1h05', blocchi: [
      B('Lavoro', "10' warm up easy bike\n3×6' @ PE7,5 · 4' easy tra i blocchi\nChiudi ad arrivare a 1h05 con ritmo libero") ] },
    { disc: 'corsa', nome: 'Run (gio) — 45\'', blocchi: [
      B('Lavoro', "10' corsa ritmo libero\n2×8' a ritmo gara olimpico · 4' corsa lenta tra i blocchi\nResto facile ad arrivare ai 45'") ] },
    { disc: 'nuoto', nome: 'Nuoto (ven) — ~2200 m', blocchi: [ B('Lavoro', 'Ritmo easy (riduci a 1500 se sposti a sabato)') ] },
    { disc: 'bici', nome: 'Bici (sab) — 1h45', blocchi: [
      B('Lavoro', "Prevalentemente PE5-6 con un blocco di 20' @ PE7 a metà seduta") ] },
    { disc: 'brick', nome: 'Brick leggero (dom)', blocchi: [
      B('Bike — 1h30', 'Facile'),
      B('Run — 25\'', 'Ritmo medio') ] },
  ] },
];

async function ins(table, rows, ret) {
  const q = sb.from(table).insert(rows);
  const { data, error } = ret ? await q.select('id') : await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

(async () => {
  // discipline referenziate (FK) — assicura che esistano
  for (const k of ['nuoto', 'bici', 'corsa', 'brick']) {
    const { error } = await sb.from('disciplina').upsert({ key: k, nome: k[0].toUpperCase() + k.slice(1) }, { onConflict: 'key' });
    if (error) throw error;
  }
  // upsert programma tri (metadati) — preserva cfg/allegati
  await sb.from('programma').upsert({ key: 'tri', nome: 'Triathlon — Mesociclo 9 (luglio)', coach: 'Paolo Morosini', durata: WEEKS.length, obiettivi: 'Preparazione 70.3 (ritmo olimpico nei lavori)' }, { onConflict: 'key' });
  // replace settimane (cascade su sessione/blocco)
  await sb.from('programma_week').delete().eq('programma_key', 'tri');

  for (const [wi, w] of WEEKS.entries()) {
    const [week] = await ins('programma_week', [{ programma_key: 'tri', titolo: w.titolo, ordinamento: wi }], true);
    for (const [xi, s] of w.sessioni.entries()) {
      const [sess] = await ins('programma_sessione', [{ week_id: week.id, disc: s.disc, nome: s.nome, ordinamento: xi }], true);
      await ins('programma_blocco', s.blocchi.map((b, bi) => ({ sessione_id: sess.id, nome: b.nome, righe: b.righe, ordinamento: bi })));
    }
  }
  console.log(`✔ Programma tri caricato: ${WEEKS.length} settimane, ${WEEKS.reduce((n, w) => n + w.sessioni.length, 0)} sessioni.`);
})().catch((e) => { console.error('\n❌ ERRORE:', e.message, '\n'); process.exit(1); });
