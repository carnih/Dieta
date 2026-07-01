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
- **Data-layer astratto (Repo pattern)** in `web/src/data/`: `repo.ts` (interfaccia), `firebaseRepo.ts` (impl. attuale), `index.ts` (`export const repo = new FirebaseRepo()` = **unico punto di swap** per la Fase 2 Supabase). Hook `useAuth`/`useStore`; `SUBS`-like realtime.
- **Dati (oggi)**: Firebase Realtime Database (progetto `dieta-b7804`, europe-west1). `apiKey` in chiaro = OK (pubblica per design).
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

## Login & sicurezza Firebase
- Login email/password (Firebase Auth), 2 account: Nicholas e Noemi. Persistente per dispositivo. Gate in `App.tsx` (`useAuth`); chip account in alto a destra.
- Regole RTDB chiuse all'**allowlist email** (NON `".read":true`; `auth != null` non basta perché chiunque può registrarsi con la apiKey pubblica).
- Identità utente (`personOf(email)` in `web/src/lib/`) chiavettata su **hash** dell'email, non email in chiaro → nessuna email personale nel sorgente (repo pubblico).

## Tab e viste (componenti React in `web/src/pages/`)
1. 🍽️ **Oggi** (`Oggi.tsx`) — confronto pasti Noemi/Nicholas del giorno; barra di confronto sticky, colonne tinte per persona, 🍕 "fuori/pasto libero" per persona e data (`overrides/{YYYY-MM-DD}/{pasto}/{n|e}`, scade da solo).
2. 🏃 **Nicholas** (`Nicholas.tsx`) — pianifica settimana (`schedule`, con "oggi" evidenziato) + dieta base (editor `nicBase`).
3. 🍓 **Noemi** (`Noemi.tsx`) — settimana a scrittura libera (`noemiSettimana`) + dieta base nutrizionista (`noemiBase`).
4. 🛒 **Spesa** (`Spesa.tsx`, stili in `pages/spesa/spesaStyles.ts`) — categorie/storico/dispensa. **Header hero sticky** (anello "presi" + 🛒 da comprare / 🏠 in dispensa + azioni) che si **compatta allo scroll**; filtri segmented Tutti/Da comprare/Dispensa. **Rimossi** i filtri-proprietario e i badge owner per riga (il campo `owners` resta nei dati, solo UI tolta). "Ultima modifica" (`spesaMeta`).
5. 🏋️ **Allenamenti** (`Allenamenti.tsx`) + **Dashboard** (`Dashboard.tsx`) — schede forza/tri editabili + 🎯 Obiettivo (`coachConfig/obiettivo`); dashboard con sezioni Triathlon/Altri, dettaglio disciplina → attività (mappa Leaflet + altimetria + salite + lap, on-demand da `training/tracks/{id}`), card Fitness=CTL.
- Componenti dieta condivisi in `web/src/pages/dieta/diet.tsx` (`MealCard`, `ChipRow`, `CatEditor`, pill categorie…).

## Pipeline dati allenamenti (automatica, fonte = intervals.icu)
**Garmin → intervals.icu (sync auto) → GitHub Action → Firebase → app.** *(Strava NON usato; export Garmin solo archiviato.)*
- `.github/scripts/sync_intervals.py` + `.github/workflows/sync-intervals.yml` (cron giornaliero ~06:00 + run manuale).
  - Scrive `training/activities` (replace idempotente; guard "se 0 attività non sovrascrivo").
  - Attività con **GPS**/lap: scarica stream/intervals (CSV, **decode utf-8-sig** per il BOM) → `training/tracks/{id}` = `{v, track, elev, climbs, laps, gain}`.
  - **Auto-heal per versione** (`TRACK_V`): rigenera le tracce vecchie (max ~30/run); input `force_tracks` per rigenerare tutto.
- Env (GitHub Secrets): `INTERVALS_ATHLETE`, `INTERVALS_KEY`, `FB_EMAIL`, `FB_PASSWORD`. L'`id` attività = **chiave** Firebase.

## Coach AI ("chiedi ai tuoi dati" da ChatGPT)
- **`web/api/coach-data.js`** (Vercel): si logga su Firebase (env `FB_EMAIL`/`FB_PASSWORD`), legge `training/activities` + `schedule` + `allenamentiCfg` + `coachConfig`, restituisce un **riassunto** (totali, carico settimanale, zone FC, CTL/ATL/forma, piano, `settimana_in_corso`, ultime 30 attività, obiettivo). Protetto da `Authorization: Bearer <COACH_API_KEY>`.
- Env Vercel: `COACH_API_KEY`, `FB_EMAIL`, `FB_PASSWORD`. Consumato da un **GPT personalizzato** (Action → OpenAPI verso `/api/coach-data`). Nessun costo API.

## Nodi Firebase (attuali)
`nicBase`, `noemiBase`, `noemiSettimana`, `allenamentiCfg`, `allenamentiSchede`, `catLabels`, `spesa`, `spesaCategories`, `spesaHistory`, `pantry`, `schedule`, `spesaMeta`, `overrides`, `coachConfig`, `schedePdf`, `training/activities`, `training/tracks`.
Default hardcoded (`NICHOLAS`, `NOEMI_BASE`, `ALLENAMENTI`) scritti al primo avvio se vuoti.

## Fase 2 (pianificata) — Supabase
Dopo il go-live del frontend: migrazione backend a **Supabase** (Postgres + Storage per **PDF/video** schede + Auth). Swap `FirebaseRepo → SupabaseRepo` (il data-layer è già astratto). Poi **backup periodico Supabase → OneDrive**. I dati Firebase sono già stati backuppati in `Backup-Dieta/` (OneDrive) prima del go-live.

## Convenzioni / workflow
- **TypeScript strict**; Tailwind + CSS var storiche. Componenti piccoli e coerenti; riusare i componenti condivisi (`diet.tsx`).
- Dopo modifiche: **build verde** (tsc --noEmit + vite build) e, per il layout, **verifica in locale** (preview) PRIMA di pushare.
- Modifica → commit → push su `main` → Vercel pubblica. Se più chat lavorano lo stesso working tree, committare **solo i propri file** (mai `git add -A`).

## File privati / archivio (NON committare → in `.gitignore`)
- `file origine/` = scan nutrizionista + export Garmin archiviato. `coach/` = dataset/script one-shot (obsoleti). `.claude/`.

## CHANGELOG
Vedi `CHANGELOG.md`. Piano/decisioni coach in `docs/COACH-AI.md`.
