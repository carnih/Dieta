// fix_tracks.mjs — backfill NON-distruttivo: rilegge le tracce da Firebase e
// aggiorna in Supabase la tabella `traccia` (geo, altimetria, dislivello, versione
// e soprattutto climbs/laps come JSONB nella forma originale). Non tocca altro.
//
// Prerequisito: aver eseguito supabase/0008_track_jsonb.sql (colonne climbs/laps).
// USO (da web/, stesse env della migrazione):
//   $env:FB_EMAIL=...; $env:FB_PASSWORD=...
//   $env:SUPABASE_URL="https://fzukrewjcquzxgrpfzaa.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY=...
//   node scripts/fix_tracks.mjs

import { createClient } from '@supabase/supabase-js';

const FB_APIKEY = 'AIzaSyAIhOcx7IPpTIRjnbbmjhKZ2bWRAjt2JT4';
const FB_DBURL = 'https://dieta-b7804-default-rtdb.europe-west1.firebasedatabase.app';
const { FB_EMAIL, FB_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
for (const [k, v] of Object.entries({ FB_EMAIL, FB_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!v) { console.error(`❌ Variabile d'ambiente mancante: ${k}`); process.exit(1); }
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  const login = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB_APIKEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: FB_EMAIL, password: FB_PASSWORD, returnSecureToken: true }) }).then((r) => r.json());
  if (!login.idToken) throw new Error('Login Firebase fallito: ' + JSON.stringify(login.error || login));

  const tracks = (await fetch(`${FB_DBURL}/training/tracks.json?auth=${login.idToken}`).then((r) => r.json())) || {};
  const ids = Object.keys(tracks);
  console.log(`Tracce da Firebase: ${ids.length}. Aggiorno traccia (climbs/laps)…`);

  let ok = 0, miss = 0;
  for (const id of ids) {
    const t = tracks[id] || {};
    const { data, error } = await sb.from('traccia').update({
      versione: t.v ?? null, dislivello_m: t.gain ?? null,
      geo: t.track ?? null, altimetria: t.elev ?? null,
      climbs: t.climbs ?? null, laps: t.laps ?? null,
    }).eq('attivita_id', id).select('attivita_id');
    if (error) { console.error('  ✗', id, error.message); continue; }
    if (data && data.length) ok++; else miss++;
  }
  console.log(`\n✔ Aggiornate ${ok} tracce; ${miss} senza riga corrispondente in 'traccia'.`);
})().catch((e) => { console.error('\n❌ ERRORE:', e.message, '\n'); process.exit(1); });
