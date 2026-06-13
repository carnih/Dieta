# COACH-AI — assistente allenamenti (stato)

Obiettivo: leggere i dati di allenamento (in continuo aggiornamento) e aiutare a interpretarli.
L'obiettivo sportivo NON è cablato: è il campo `coachConfig/obiettivo`, modificabile in app (🎯 tab Allenamenti).

## ✅ Fatto e in produzione

### Fonte dati: intervals.icu (NON Strava, NON export Garmin)
- Garmin → **intervals.icu** (sync automatico, gratis) → **GitHub Action** → Firebase.
- `.github/scripts/sync_intervals.py` (cron giornaliero): scrive `training/activities` (replace idempotente, guard anti-azzeramento) + `training/tracks/{id}` per le attività con GPS/lap.
- Auto-heal per versione schema (`TRACK_V`): le tracce vecchie si rigenerano da sole (~30/run); input `force_tracks` per farle tutte subito.
- Segreti in GitHub Secrets: `INTERVALS_ATHLETE`, `INTERVALS_KEY`, `FB_EMAIL`, `FB_PASSWORD`.
- Lo storico (8 mesi, ~260 attività) è stato importato da intervals.icu (che aveva già tutto). L'export Garmin è solo **archiviato** in `file origine/Dati grezzi allenamenti/` (nessun richiamo nel codice).

### Dashboard in-app (gratis)
Tab Allenamenti → "Vuoi capire come sta andando?" → dashboard:
- card per disciplina (Triathlon: bici/corsa/nuoto/forza; Altri: padel + "Altri" raggruppati), Fitness=CTL;
- dettaglio disciplina → tutte le attività → **dettaglio singola attività**: mappa **Leaflet+OSM**, profilo altimetrico (Chart.js), **salite** (tempo, pendenza media+max, FC media/max, cadenza, VAM, velocità), **lap** (passo/km · km/h · /100m + FC/cadenza/W).
- Dati traccia caricati on-demand da `training/tracks/{id}`.

### Coach AI via ChatGPT (gratis, "Strada B")
- Endpoint **`api/coach-data.js`** su Vercel (protetto da `COACH_API_KEY`): restituisce riassunto aggiornato (totali, carico settimanale, zone, CTL/ATL/forma, **piano_settimana_programmato** vs **ultime_attivita**, **programmi_in_corso**, obiettivo).
- **GPT personalizzato** su ChatGPT con Action → chiama l'endpoint, risponde sui dati freschi. Nessun costo API.
- Env Vercel: `COACH_API_KEY`, `FB_EMAIL`, `FB_PASSWORD`.

## Decisioni prese
- Aggiornamento dati: **intervals.icu** (non Strava — l'API Strava è gratis ma intervals dà anche storico+GPS senza attriti).
- Chat: **ChatGPT con GPT personalizzato + Action** (gratis con l'abbonamento). NON chat in-app (richiederebbe API LLM a consumo).
- Obiettivo gara: **configurabile** (`coachConfig`), non hardcoded.
- Mappe: **Leaflet + OpenStreetMap** (mappa vera, non SVG).

## Possibili prossimi step
- Curva Forma (CTL/ATL/TSB) come grafico in dashboard.
- Ricalibrare le **zone FC** (intervals le definisce diversamente da Garmin → in dashboard risultano sbilanciate).
- Piano vs fatto più dettagliato (strutturare i piani del coach, oggi solo `schedule` + settimana programma).
- Riepilogo settimanale automatico (email/Telegram via GitHub Action).
- Categoria salite (HC/1-4), confronto attività.

## Sicurezza / privacy
- Dati di salute sotto Firebase protetto (2 account). Segreti solo in GitHub Secrets / Vercel env.
- Endpoint coach protetto da `COACH_API_KEY` (Bearer): non pubblicamente leggibile.
