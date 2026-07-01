# Changelog — Dieta

Storico delle modifiche significative all'app. Le voci più recenti in alto.
Formato libero: data — cosa è cambiato e perché.

## 2026-07-01 — Fase 2: migrazione backend a Supabase + triathlon multi-sessione
- **Backend Firebase → Supabase (completata, in produzione)**. Il data-layer astratto (Repo pattern) ha reso lo switch pulito: `SupabaseRepo` (`web/src/data/supabaseRepo.ts`) affianca `FirebaseRepo`, selezione via flag **`VITE_USE_SUPABASE`** in `web/src/data/index.ts`. Firebase è **sganciato** (app, sync, coach leggono/scrivono Supabase) e può essere dismesso.
  - **Schema 3NF** (`supabase/schema.sql`): tabelle normalizzate (attivita, traccia, spesa_*, nic_*, noemi_*, programma/week/sessione/blocco, schedule_giorno, override_pasto, coach_config, membro, disciplina…), audit-cols + trigger, CHECK/ENUM, indici FK, **RLS force** con `is_membro()` (security-definer). Migrazioni: `0004` override, `0005` realtime publication, `0006` RPC di scrittura "hot" (SECURITY INVOKER), `0007` Storage bucket `schede` (privato), `0008` traccia.climbs/laps come **jsonb** (colonne inventate rompevano lap/salite → ora jsonb fedele a intervals.icu).
  - `SupabaseRepo`: legge ricostruendo il JSON stile-Firebase dalle tabelle; scrive **ottimistico** (echo immediato ai subscriber) + apply (RPC per le scritture calde); realtime via `postgres_changes` con refetch debounced. PDF schede via Storage (signed URL).
  - **Sync intervals.icu** (`.github/scripts/sync_intervals.py` + workflow): scrive su Supabase via REST (`Prefer: resolution=merge-duplicates`), attivita + traccia (climbs/laps jsonb). Rimossa la scrittura su Firebase.
  - **Coach** (`web/api/coach-data.js`): legge Supabase via REST con **service_role** (bypassa RLS), payload arricchito con `schede` complete (settimana `corrente:true`) e `settimana_in_corso`.
  - **Env**: app/Vercel `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USE_SUPABASE`; funzione coach `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `COACH_API_KEY`; Action `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. `FB_EMAIL`/`FB_PASSWORD` non più usate. **service_role è SEGRETO** (solo Vercel env + GitHub Secrets, mai nel repo/chat); anon key è pubblica.
- **Triathlon multi-sessione** (più sedute per disciplina nella stessa settimana, es. 2 nuoto + 2 bici). Programma di luglio (Mesociclo 9) caricato via `web/scripts/seed_tri.mjs` (4 settimane × 6 sedute).
  - `sessView` (Allenamenti): header = **disciplina**, `nome` come **sottotitolo** (`.al-sess-sub`).
  - **Mappatura per ordine** (`sessioneDelGiorno`): l'N-esimo giorno pianificato di una disciplina prende l'N-esima seduta di quella disciplina nella scheda (es. Nuoto lun+mer → lun=seduta #1, mer=#2).
  - Planner Nicholas ora **Lun→Dom** (`PLAN_DAYS`), non più dom-sab.

## 2026-07-01 — Go-live stack React + fix mobile (parità NetWorth) + redesign UI
- **Migrazione a React**: l'app di produzione è ora `web/` (**React 18 + Vite + TS + Tailwind**), con **data-layer astratto** (Repo pattern) pronto allo swap Supabase (Fase 2). Vercel **Root Directory = `web`**; coach in `web/api/`; `index.html` **no-cache** (stop build vecchia in cache su PWA iOS). Backup dati Firebase in OneDrive prima dello switch. Il monolite `index.html` resta come fallback storico.
- **Mobile sistemato copiando NetWorth**: scroll normale del documento (`min-h-screen`), **anti-zoom iOS** (viewport re-assert dopo i font, `-webkit-text-size-adjust:100%`, `overflow-x:clip`, input ≥16px). Rimossi i trucchi (`overflow:hidden`/`100dvh`/shell fisso) che rompevano il dimensionamento (app al 70%, poi zoom). Chip account `absolute` (non più bloccato).
- **Redesign UI** coerente su tutte le pagine (Varela Round, card morbide, gerarchia pulita): **Oggi** (barra confronto + colonne tinte + stato vuoto elegante), **Nicholas** (settimana con "oggi" evidenziato), **Noemi**, titoli uniformati a 32px (era `px-4.5` non valido → titoli attaccati al bordo).
- **Spesa (opzione B)**: header **hero** con anello "presi" + 🛒 da comprare / 🏠 in dispensa + azioni, in **blocco sticky** che si **compatta allo scroll**; filtri segmented. **Rimossi** i filtri-proprietario e i badge owner per riga (campo `owners` conservato nei dati).
- **Doc**: `CLAUDE.md` riscritto sullo stack React.

## 2026-06-21 — Settimana dom→sab, schede fedeli al PDF, editor schede
- **Oggi**: il calendario settimanale ora va **domenica → sabato** (prima lun→dom). `NOEMI_DAYS` riordinato dom-first, `todayId()`/`weekDates()` ancorati alla domenica; `mondayOf`/`settCorrente` (settimane dei programmi) invariati.
- **Scheda forza riscritta fedele al PDF** del PT (`file origine/Allenamenti/2026-05-18 Forza.pdf`, 8 settimane): fasi separate e cue del PT riportate (carichi graduali, "2 reps prima del cedimento", progressioni, superset, finisher 28-21-15-9…). Aggiunto `forza.note` (testata) mostrato in `progCard` (📝).
- **Tri** verificato vs PDF (Mesociclo 9): già fedele; aggiunta la nota nutrizionale del PT (40→60 g CHO/h crescenti nei brick, per allenare l'intestino).
- **Editor schede** (forza + tri): contenuto schede ora **editabile in app e persistito su Firebase** (`allenamentiSchede`, seed dai default). `ALLENAMENTI` da `const`→`let`; pulsante **✏️ Modifica** in `progCard`; `renderSchedeEdit` con aggiungi/modifica/elimina di settimane, blocchi e (tri) discipline. `durata` ricalcolata sul n° settimane.

## 2026-06-14 — Coach "settimana in corso", healthcheck robusto, volume settimanale in dashboard
- **Coach endpoint** (`api/coach-data.js`): nuovo blocco `settimana_in_corso` (oggi, giorni rimanenti, `piano_gia_dovuto` vs `piano_ancora_da_fare`, attività della settimana). Il GPT non valuta più la settimana come conclusa a metà e avvisa se un allenamento citato potrebbe essere solo non ancora sincronizzato.
- **Healthcheck** (`healthcheck.yml`): sostituito il conteggio parentesi (falsi allarmi per le `()` dentro le stringhe) con `node --check` sul modulo estratto → valida la sintassi ESM reale.
- **Dashboard**: card **"Ore/sett"** (media ultime 8 settimane + trend vs 8 precedenti), riga di lettura sul volume, e grafico **"Ore settimanali medie / mese"** (progressione). Calcolo in `computeDash` (`avgWkMonth`/`avgWkRecent`/`avgWkPrev`).

## 2026-06-13 — Coach AI, dashboard mappe/lap, pipeline intervals.icu, migrazione Vercel
- **Account chip** in alto a destra (login/logout pulito); rimosso il vecchio "Esci" a fondo pagina.
- **Spesa**: "ultimo aggiornamento di [utente] · data" in fondo (`spesaMeta`).
- **Dieta**: 🍕 "fuori/pasto libero" selezionabile **per persona** e legato alla **data reale** (scade da solo): `overrides/{data}/{pasto}/{n|e}`.
- **Dashboard allenamenti** (tab Allenamenti → "come sta andando"): sezioni Triathlon/Altri, dettaglio per disciplina, **dettaglio singola attività** con **mappa Leaflet+OSM, profilo altimetrico, salite (tempo/pendenza media+max/FC/cadenza/VAM/velocità), lap** (passo/km·km/h·/100m). Card **Fitness=CTL**.
- **Pipeline dati = intervals.icu** (non più export Garmin né Strava): `sync_intervals.py` + workflow `sync-intervals.yml` (cron) scrivono `training/activities` e `training/tracks/{id}`; tracce con **auto-heal per versione** (`TRACK_V`) + input `force_tracks`. Fix BOM CSV (decode utf-8-sig). Export Garmin archiviato in `file origine/`.
- **Coach AI**: function Vercel `api/coach-data.js` (protetta da `COACH_API_KEY`) che espone il riassunto allenamenti; consumata da un **GPT personalizzato** su ChatGPT (gratis). Obiettivo gara non più cablato → campo 🎯 `coachConfig/obiettivo` in app.
- **Hosting → Vercel** (`https://dieta-livid.vercel.app/`); function in `api/`, healthcheck aggiornato al dominio Vercel. Rimossi file Netlify.
- **Qualità/pulizia**: codice morto rimosso, guardie anti-schermo-bianco su dati Firebase, dedup (`DISC_MAIN`/`mmss`/`MSG_SAVED`), nodi DB orfani `noemi`/`noemiPlan` eliminati.

## 2026-06-09 — Sicurezza (login)
- Aggiunto **gate di autenticazione** (Firebase Auth, email/password). L'app non parte finché
  non si è loggati; login persistente per dispositivo (`browserLocalPersistence`). Schermata `#login`,
  funzioni `doLogin`/`doLogout`, sottoscrizioni Firebase avviate solo dopo l'accesso (`initFirebaseSubs`/`startApp`).
  Motivo: chiudere il Realtime Database, che aveva regole aperte a tutti (avviso di sicurezza Firebase).
  Va accompagnato dalle regole DB che limitano l'accesso all'email in allowlist (vedi CLAUDE.md › Sicurezza).

## 2026-06-09
- **Refactor & pulizia `index.html`** (−169 righe nette). Verificato in browser: tutte le tab,
  category manager ed editor base renderizzano, zero errori in console.
  - Rimosso codice morto: vecchio "Pantry Manager" (`renderPantryManager` + relative funzioni),
    vecchio editor categorie (`renderCategoryEditor`/`editCategory`/`saveCategoryEdit`/`editingCat`),
    variabili `editMode`/`pantryManager`, classe CSS `.content.saving`, `#fab` e ~25 classi CSS orfane.
    (Tenuti vivi: `deleteCategoryEdit`, `.cat-editor-overlay`, `.ed-cat`, i `.be-*`.)
  - Nuovo helper `dbSet(path, val)`: gestione errori reale sui salvataggi Firebase. Prima i `set()`
    erano in `try/catch` sincroni che NON catturavano i fallimenti async → errori invisibili.
    Tutti i ~17 `try{ set(...) }catch{}` sostituiti con `dbSet(...)`.
  - `esc()` ora escapa anche `"` e `'` (prima un nome con virgolette rompeva gli attributi HTML).
  - Le 10 sottoscrizioni `onValue` ripetitive → tabella dichiarativa `SUBS` (path, assegna, quando-rirenderizzare).
  - Helper unico `addSpesaItem()` al posto della closure `addTo` duplicata in 2 punti.
  - Guardia su data malformata in `settCorrente()` (evita "settimana NaN").
- Aggiunti `CLAUDE.md` (contesto progetto, letto in automatico da Claude Code) e questo `CHANGELOG.md`,
  per non perdere il contesto se una chat viene chiusa/cancellata.

<!--
Modello per le prossime voci:

## AAAA-MM-GG
- Cosa è stato modificato (file/funzione) — motivo.
-->
