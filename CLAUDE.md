# CLAUDE.md — Contesto progetto "Dieta"

> Letto in automatico a inizio sessione. Tienilo aggiornato quando cambia architettura/feature.
> ⚠️ NON scrivere qui segreti (password, API key): questo file è committato. I segreti stanno
> solo nei **GitHub Secrets** e nelle **env di Vercel**.

## Cos'è
Web-app privata mobile-first per: **dieta** (Nicholas & Noemi), **allenamenti** (con dashboard analitica + coach AI), **lista spesa** condivisa.
- Live: **https://dieta-livid.vercel.app/** (Vercel)
- Repo: `carnih/Dieta` (privato; valutare **public** per Actions illimitate/affidabili — non ci sono segreti nel codice)

## Architettura (volutamente minimale — niente build/framework)
- **Un solo file**: `index.html` — HTML+CSS+JS vanilla (ES module). Firebase + Chart.js + Leaflet importati da CDN. Nessun npm/bundler.
- **Dati**: Firebase Realtime Database (progetto `dieta-b7804`, europe-west1). `apiKey` in chiaro = OK (pubblica per design). Realtime con `onValue`/`set`.
- **Hosting/deploy**: **Vercel**, deploy automatico ad ogni push su `main`. (Il vecchio `dietacarstr.netlify.app` potrebbe esistere ancora ma il sito di riferimento è quello Vercel.)
- **Funzioni serverless**: cartella **`api/`** (formato Vercel). C'è `api/coach-data.js` (vedi Coach AI).
- **Healthcheck**: `.github/workflows/healthcheck.yml` (cron) → controlla che il sito Vercel sia su e il JS bilanciato.

## Login & sicurezza Firebase
- Login email/password (Firebase Auth), 2 account: Nicholas e Noemi. Persistente per dispositivo. Gate in fondo allo `<script>` (`onAuthStateChanged`); chip account in alto a destra (`#acct`).
- Regole RTDB chiuse all'**allowlist email** (NON `".read":true`; `auth != null` da solo non basta perché chiunque può registrarsi con la apiKey pubblica).
- Credenziali/segreti → SOLO in GitHub Secrets / Vercel env, mai nel repo.

## Tab e viste (render in `index.html`)
1. 🍽️ Dieta/oggi → `renderOggi()` — confronto pasti del giorno; **🍕 "fuori/pasto libero" per persona e per data** (override in `overrides/{YYYY-MM-DD}/{pasto}/{n|e}`, scade da solo).
2. 🏃 Nicholas → `renderNicholasTab()` — pianifica settimana (`schedule`) + dieta base.
3. 🍓 Noemi → `renderNoemiTab()` — settimana a scrittura libera (`noemiSettimana`).
4. 🛒 Spesa → `renderSpesaTab()` — categorie/drag&drop/storico/proprietari + **"ultima modifica" (utente+data)** in fondo (`spesaMeta`, helper `markSpesaEdit`).
5. 🏋️ Allenamenti → `renderAllenamentiTab()` — schede + campo **🎯 Obiettivo** modificabile (`coachConfig/obiettivo`) + bottone **dashboard**.
   - **Dashboard** (`renderDashboard`): sezioni Triathlon (bici/corsa/nuoto/forza) e Altri (padel + "Altri" raggruppati); card cliccabili → `renderDashDetail` (per disciplina) → riga attività cliccabile → `renderActivityDetail` (singola attività con **mappa Leaflet + profilo altimetrico + salite + lap**, caricati on-demand da `training/tracks/{id}` via `loadActivityTrack`). Card "Fitness" = CTL.

## Pipeline dati allenamenti (automatica, fonte = intervals.icu)
**Garmin → intervals.icu (sync auto) → GitHub Action → Firebase → app.** *(Strava NON usato; export Garmin solo archiviato, vedi sotto.)*
- `.github/scripts/sync_intervals.py` + `.github/workflows/sync-intervals.yml` (cron giornaliero ~06:00 + run manuale).
  - Scrive `training/activities` (replace idempotente; con guard "se 0 attività non sovrascrivo").
  - Per attività **con GPS** (corsa/bici/nuoto outdoor) e con **lap** (corsa/bici/nuoto): scarica gli stream/intervals da intervals.icu (CSV, **decode utf-8-sig** per il BOM) e scrive `training/tracks/{id}` = `{v, track, elev, climbs, laps, gain}`.
  - **Auto-heal per versione**: ogni record traccia ha `v` (= `TRACK_V`). Se `v` è vecchio, il run rigenera (max ~30/run → in pochi giorni tutto allineato). Input workflow `force_tracks` per rigenerare TUTTO subito.
- Env (GitHub Secrets): `INTERVALS_ATHLETE`, `INTERVALS_KEY`, `FB_EMAIL`, `FB_PASSWORD`.
- L'app deriva l'`id` attività dalla **chiave** Firebase (la SUBS di `training/activities` fa `{...r, id:r.id||k}`).

## Coach AI ("chiedi ai tuoi dati" da ChatGPT)
- **`api/coach-data.js`** (Vercel): si logga su Firebase (env `FB_EMAIL`/`FB_PASSWORD`), legge `training/activities` + `schedule` + `allenamentiCfg` + `coachConfig`, e restituisce un **riassunto** (totali, carico settimanale, zone FC, CTL/ATL/forma, piano settimanale programmato, settimana del programma, ultime 30 attività, obiettivo). Protetto da header `Authorization: Bearer <COACH_API_KEY>`.
- Env Vercel: `COACH_API_KEY`, `FB_EMAIL`, `FB_PASSWORD`.
- Consumato da un **GPT personalizzato** su ChatGPT (Action → schema OpenAPI che punta a `https://dieta-livid.vercel.app/api/coach-data`, auth Bearer con la stessa key). Nessun costo API (è il ChatGPT Plus dell'utente).
- Obiettivo NON cablato: si imposta dal campo 🎯 in app (`coachConfig/obiettivo`).

## Nodi Firebase (attuali)
`nicBase`, `noemiBase`, `noemiSettimana`, `allenamentiCfg`, `catLabels`, `spesa`, `spesaCategories`, `spesaHistory`, `pantry`, `schedule`, `spesaMeta`, `overrides`, `coachConfig`, `training/activities`, `training/tracks`.
(Rimossi nodi orfani `noemi` e `noemiPlan`.) Default hardcoded (`NICHOLAS`, `NOEMI_BASE`, `ALLENAMENTI`) scritti al primo avvio se vuoti.

## Helper chiave (riusare, non reinventare)
- `dbSet(path,val)` — unica via di scrittura Firebase (gestisce errori async).
- `esc(s)` — escaping HTML (incl. virgolette). Sempre su dati utente nei template.
- `mmss(x)` — formatta minuti→`m:ss`. `DISC_MAIN` — array discipline tri. `MSG_SAVED` — "✓ Salvato".
- `SUBS` — tabella dichiarativa sottoscrizioni Firebase `[path, assegna, quando-rirenderizzare]`.
- `addSpesaItem`, `markSpesaEdit`, `togglePastoLibero`, `loadActivityTrack`.

## File privati / archivio (NON committare → in `.gitignore`)
- `file origine/` = scan nutrizionista + **export Garmin archiviato** (`file origine/Dati grezzi allenamenti/*.zip`) — NON referenziato dal codice, solo archivio.
- `coach/` = dataset normalizzato locale + script one-shot (`normalize.py`) + analisi (`analisi.md`). Obsoleti (la fonte è intervals.icu), tenuti come riferimento.
- `.claude/`.

## Convenzioni / workflow
- Vanilla JS compatto, single-file, niente librerie nuove se evitabile. CSS via variabili `:root` (`--n` blu Nicholas, `--e` rosa Noemi, `--grn` verde spesa).
- Dopo modifiche al JS: verificare parentesi/backtick bilanciati (`{}` e `[]` devono tornare; `()` ha un offset costante per le parentesi dentro le stringhe — confrontare col delta precedente, non con 0).
- Modifica → commit → push su `main` → Vercel pubblica. (La preview locale via `python -m http.server` può essere inaffidabile in alcuni ambienti.)

## CHANGELOG
Vedi `CHANGELOG.md`. Piano/decisioni coach in `docs/COACH-AI.md`.
