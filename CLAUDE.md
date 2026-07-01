# CLAUDE.md — Contesto progetto "Dieta"

> Letto in automatico a inizio sessione. Tienilo aggiornato quando cambia architettura/feature.
> ⚠️ NON scrivere qui segreti (password, API key): questo file è committato. I segreti stanno
> solo nei **GitHub Secrets** e nelle **env di Vercel**.

## Cos'è
Web-app privata mobile-first per: **dieta** (Nicholas & Noemi), **allenamenti** (con dashboard analitica + coach AI), **lista spesa** condivisa.
- Live: **https://dieta-livid.vercel.app/** (Vercel)
- Repo: `carnih/Dieta` — **public** (per Actions schedulate affidabili/illimitate: il cron su repo privato veniva saltato). Cronologia ripulita dalle email personali. Nessun segreto nel codice né nella storia: solo in GitHub Secrets / Vercel env.

## Architettura (stack moderno — dal go-live giugno 2026)
- **App**: `web/` — **React 18 + Vite + TypeScript (strict) + Tailwind**. Titoli Varela Round, corpo Nunito Sans; token storici come CSS var in `web/src/styles/index.css` (`--n` blu Nicholas, `--e` rosa Noemi, `--grn` verde spesa, `--bg`, `--shadow-soft`, `--r`) mirrorati in `tailwind.config.js`. Alias `@` → `web/src`.
- **Data-layer astratto (Repo pattern)** in `web/src/data/`: `repo.ts` (interfaccia path/JSON stile-Firebase), `firebaseRepo.ts` (legacy), `supabaseRepo.ts` (**impl. attuale**), `index.ts` = punto di swap: `const useSupabase = hasSupabase() && VITE_USE_SUPABASE==='true'; export const repo = useSupabase ? new SupabaseRepo() : new FirebaseRepo()`. Hook `useAuth`/`useStore` non toccano il backend, usano `repo`.
- **Dati (oggi) = Supabase** (Postgres, progetto `fzukrewjcquzxgrpfzaa`). Schema **3NF** in `supabase/schema.sql` (+ migrazioni `0004`–`0008`): tabelle normalizzate, audit-cols+trigger, CHECK/ENUM, **RLS force** con `is_membro()` (security-definer), **Realtime** (`postgres_changes`), **Storage** (bucket privato `schede` per i PDF). `traccia.climbs`/`laps` = **jsonb** (fedeli a intervals.icu; NON normalizzare in colonne). Scritture "calde" via **RPC** (`replace_spesa_*`, `replace_pantry`, `set_override`). `SupabaseRepo` ricostruisce il JSON stile-Firebase in lettura e fa scrittura **ottimistica** (echo ai subscriber) + apply, con refetch realtime debounced.
- **Anon key** pubblica (safe, protetta da RLS). **service_role SEGRETA**: mai nel repo né in chat, solo Vercel env + GitHub Secrets.
- **Firebase**: sganciato (Realtime DB `dieta-b7804`). Resta `firebaseRepo.ts` come fallback dietro il flag; il progetto Firebase è dismissibile. Dati storici backuppati in `Backup-Dieta/` (OneDrive) prima della migrazione.
- **Hosting/deploy**: **Vercel**, deploy automatico ad ogni push su `main`. **Root Directory = `web`** (preset Vite, output `dist`). Funzioni serverless in **`web/api/`** (`coach-data.js`). `web/vercel.json`: rewrite SPA + **`index.html` no-cache** (l'HTML si rivalida sempre → niente build vecchia in cache su PWA iOS; gli asset sono content-hashed/immutabili).
- **Build (per il path OneDrive con `&`)**: NON usare `npm run`/Vite dev (la `&` rompe la shell). Usare da `web/`:
  `node "node_modules/typescript/bin/tsc" -p tsconfig.json --noEmit` (+ `tsconfig.node.json`) e `node "node_modules/vite/bin/vite.js" build`.
- **Legacy**: il vecchio `index.html` monolite (root) resta come fallback storico, NON servito in produzione.
- **Healthcheck**: `.github/workflows/healthcheck.yml` (cron) → sito su + markup React (`id="root"` + `/assets/`).

## Mobile — REPLICARE NetWorth (`NetWorth/web`), non inventare
NetWorth è ottimizzato su mobile; Dieta ne copia l'approccio. **MAI** `overflow:hidden`/`height:100%`/`100dvh`/shell `position:fixed` sul body (rompono il dimensionamento su iOS standalone: app al 70%, poi zoom).
- **Scroll normale del documento**, shell `min-h-screen`.
- **Anti-zoom iOS** (lo "zoom brutto" all'apertura = FOUT dei Google Fonts): script in `web/index.html` che ri-asserisce il meta viewport dopo `document.fonts.ready`; in `index.css` `-webkit-text-size-adjust:100%` + `overflow-x:clip` + `max-width:100%` su html/body/#root; **input ≥16px** su mobile (sotto zooma al focus).
- Barra `fixed` che copre la safe-area in alto (notch); chip account `absolute` (ancorato alla pagina, scrolla via); bottom-nav con safe-area-inset-bottom.
- Il rubber-band elastico a fine pagina è normale iOS (anche NetWorth) → si tiene.
- **Verificare il layout in locale prima di deployare**: `preview_start` config `dieta-dist` (serve `web/dist`) + misura DOM via `preview_eval` (l'anteprima headless non renderizza React/Firebase, ma le misure di altezza/scroll sullo shell/DOM sintetico bastano).

## Login & sicurezza
- Login email/password, 2 account (Nicholas e Noemi). Persistente per dispositivo. Gate in `App.tsx` (`useAuth`); chip account in alto a destra.
- **Accesso dati chiuso da RLS force** (Postgres): la fn `is_membro()` (security-definer) autorizza solo gli account in tabella `membro`; l'anon key da sola non legge nulla. La funzione coach usa `service_role` (bypassa RLS) lato server.
- Identità utente (`personOf(email)` in `web/src/lib/`) chiavettata su **hash** dell'email, non email in chiaro → nessuna email personale nel sorgente (repo pubblico).

## Tab e viste (componenti React in `web/src/pages/`)
1. 🍽️ **Oggi** (`Oggi.tsx`) — confronto pasti Noemi/Nicholas del giorno; barra di confronto sticky, colonne tinte per persona, 🍕 "fuori/pasto libero" per persona e data (`overrides/{YYYY-MM-DD}/{pasto}/{n|e}`, scade da solo).
2. 🏃 **Nicholas** (`Nicholas.tsx`) — pianifica settimana (`schedule`, con "oggi" evidenziato) + dieta base (editor `nicBase`).
3. 🍓 **Noemi** (`Noemi.tsx`) — settimana a scrittura libera (`noemiSettimana`) + dieta base nutrizionista (`noemiBase`).
4. 🛒 **Spesa** (`Spesa.tsx`, stili in `pages/spesa/spesaStyles.ts`) — categorie/storico/dispensa. **Header hero sticky** (anello "presi" + 🛒 da comprare / 🏠 in dispensa + azioni) che si **compatta allo scroll**; filtri segmented Tutti/Da comprare/Dispensa. **Rimossi** i filtri-proprietario e i badge owner per riga (il campo `owners` resta nei dati, solo UI tolta). "Ultima modifica" (`spesaMeta`).
5. 🏋️ **Allenamenti** (`Allenamenti.tsx`) + **Dashboard** (`Dashboard.tsx`) — schede forza/tri editabili + 🎯 Obiettivo (`coachConfig/obiettivo`); dashboard con sezioni Triathlon/Altri, dettaglio disciplina → attività (mappa Leaflet + altimetria + salite + lap, on-demand da `training/tracks/{id}`), card Fitness=CTL.
   - **Multi-sessione per disciplina**: una settimana tri può avere più sedute della stessa disciplina (es. 2 nuoto + 2 bici). In `sessView` l'header è la **disciplina**, `nome` è il **sottotitolo**. "Scheda di oggi" usa `sessioneDelGiorno` (mappatura **per ordine**: l'N-esimo giorno pianificato di una disciplina → N-esima seduta di quella disciplina). Planner Nicholas = **Lun→Dom** (`PLAN_DAYS`). Programma corrente caricato via `web/scripts/seed_tri.mjs`.
- Componenti dieta condivisi in `web/src/pages/dieta/diet.tsx` (`MealCard`, `ChipRow`, `CatEditor`, pill categorie…).

## Pipeline dati allenamenti (automatica, fonte = intervals.icu)
**Garmin → intervals.icu (sync auto) → GitHub Action → Supabase → app.** *(Strava NON usato; export Garmin solo archiviato.)*
- `.github/scripts/sync_intervals.py` + `.github/workflows/sync-intervals.yml` (cron giornaliero ~06:00 + run manuale).
  - Upsert su Supabase via REST (`Prefer: resolution=merge-duplicates`): tabella `attivita` + `traccia` (con `climbs`/`laps` come **jsonb**). Guard "se 0 attività non sovrascrivo".
  - Attività con **GPS**/lap: scarica stream/intervals (CSV, **decode utf-8-sig** per il BOM). L'`id` intervals = chiave attività.
  - **Auto-heal per versione** (`TRACK_V`): rigenera le tracce vecchie; input `force_tracks` per rigenerare tutto.
- Env (GitHub Secrets): `INTERVALS_ATHLETE`, `INTERVALS_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Coach AI ("chiedi ai tuoi dati" da ChatGPT)
- **`web/api/coach-data.js`** (Vercel): legge Supabase via **REST con service_role** (bypassa RLS), restituisce un **riassunto** (totali, carico settimanale, zone FC, CTL/ATL/forma, piano, `settimana_in_corso`, **`schede` complete** con settimana `corrente:true`, ultime 30 attività, obiettivo). Protetto da `Authorization: Bearer <COACH_API_KEY>`.
- Env Vercel: `COACH_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Consumato da un **GPT personalizzato** (Action → OpenAPI verso `/api/coach-data`). Nessun costo API.

## Dati (path logici via Repo → tabelle Supabase)
Il `Repo` espone ancora path stile-Firebase (compatibilità): `nicBase`, `noemiBase`, `noemiSettimana`, `allenamentiCfg`, `allenamentiSchede`, `catLabels`, `spesa`, `spesaCategories`, `spesaHistory`, `pantry`, `schedule`, `spesaMeta`, `overrides`, `coachConfig`, `schedePdf`, `training/activities`, `training/tracks`. `SupabaseRepo` li mappa sulle tabelle 3NF (`schema.sql`). Default hardcoded (`NICHOLAS`, `NOEMI_BASE`, `ALLENAMENTI`) usati come fallback se il nodo è vuoto.

## Fase 2 — Supabase ✅ COMPLETATA (2026-07-01)
Backend migrato a **Supabase** (Postgres 3NF + RLS + Realtime + Storage per i PDF schede). Swap `FirebaseRepo → SupabaseRepo` via flag `VITE_USE_SUPABASE`. Schema in `supabase/schema.sql` (+ `0004`–`0008`); migrazione dati con `web/scripts/migrate.mjs`; RPC in `0006`. App, sync intervals e coach leggono/scrivono Supabase; Firebase è dismissibile.
- **Rimasto**: backup periodico Supabase → OneDrive (schedulato/script) — vedi memoria `supabase-backup-onedrive`.

## Convenzioni / workflow
- **TypeScript strict**; Tailwind + CSS var storiche. Componenti piccoli e coerenti; riusare i componenti condivisi (`diet.tsx`).
- Dopo modifiche: **build verde** (tsc --noEmit + vite build) e, per il layout, **verifica in locale** (preview) PRIMA di pushare.
- Modifica → commit → push su `main` → Vercel pubblica. Se più chat lavorano lo stesso working tree, committare **solo i propri file** (mai `git add -A`).

## File privati / archivio (NON committare → in `.gitignore`)
- `file origine/` = scan nutrizionista + export Garmin archiviato. `coach/` = dataset/script one-shot (obsoleti). `.claude/`.

## CHANGELOG
Vedi `CHANGELOG.md`. Piano/decisioni coach in `docs/COACH-AI.md`.
