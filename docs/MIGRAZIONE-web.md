# Migrazione Dieta → stack moderno (come NetWorth)

> Obiettivo (deciso giu 2026): portare Dieta dallo stack "MVP" (single-file
> `index.html` vanilla + Firebase RTDB + media base64) allo **stesso stack di
> NetWorth**: React + Vite + TypeScript + Tailwind, e a regime **Supabase**
> (Postgres + RLS + Storage + Auth). Branch: `refactor/web-stack`.
> Il `main` (monolite `index.html`) resta **LIVE in produzione** finché la nuova
> app non è pronta e si fa lo switch su Vercel.

## Perché
- `index.html` ha superato la taglia comoda (~2.900 righe, no tipi, no componenti).
- Media (PDF/video) come base64 nel DB = rattoppo (no CDN/streaming; Firebase
  Storage ora è a pagamento). Supabase Storage ha tier gratuito.
- Due stack diversi (Dieta vs NetWorth) = doppio costo di manutenzione.

## Fasi
- **Fase 1 — Frontend (in corso)**: React+Vite+TS+Tailwind in `web/`, **tenendo
  Firebase** come backend ma **dietro un'astrazione `Repo`** (così la Fase 2 è
  uno swap pulito). Si migra vista per vista; build verde a ogni passo.
- **Fase 2 — Backend**: `FirebaseRepo` → `SupabaseRepo` (Postgres + Storage +
  Auth). Migrazione dati + account. Si progetta lo schema 3NF (come NetWorth).

## Stato Fase 1
- ✅ Scaffold Vite+React+TS+Tailwind (`web/`), build verde.
- ✅ **Data-layer astratto**: `src/data/repo.ts` (interfaccia `Repo`),
  `src/data/firebaseRepo.ts` (impl. Firebase Auth+RTDB), `src/data/index.ts`
  (singleton `repo` = UNICO punto da cambiare per Supabase). Hook `useAuth`/
  `useStore` non importano più Firebase: usano `repo`.
- ✅ App shell: gate auth + tab nav + chip account + `Login`.
- ⏳ **Da migrare** (viste, in ordine; fonte = `index.html` su `main`):
  1. 🍽️ Oggi (`renderOggi`) — confronto pasti, calendario dom→sab, pasto libero.
  2. 🛒 Spesa — categorie, drag&drop, storico, filtri, meta.
  3. 🏃 Nicholas / 🍓 Noemi — pianificazione + dieta base + editor.
  4. 🏋️ Allenamenti + Dashboard — Chart.js/Leaflet, salite, lap, brick, editor schede, viewer PDF.
  5. Coach config, intestazioni sticky, ecc.
- Poi: **switch Vercel** sul build `web/` + healthcheck aggiornato (con conferma utente).

## Convenzioni / build
- **Path OneDrive con `&`**: rompe `npm run <script>`. Si invocano i binari con
  `node` diretto (come NetWorth, **niente junction**), dalla cartella `web/`:
  - typecheck: `node "node_modules/typescript/bin/tsc" -p tsconfig.json --noEmit`
  - build: `node "node_modules/vite/bin/vite.js" build` → output in `web/dist`.
  - `npm install` funziona normalmente. Dev server Vite (HMR) può non girare per
    il `&`: in caso, loop build + preview statico su `web/dist`.
- TS **strict**, alias `@` → `src`, Tailwind con i token storici (`--n` blu
  Nicholas, `--e` rosa Noemi, `--grn` verde spesa).
- Stile di lavoro: una vista per volta, build verde + commit per ogni slice;
  `main` resta la produzione viva.

## Nodi dati attuali (Firebase RTDB) — da mappare in Fase 2 (Postgres)
`nicBase`, `noemiBase`, `noemiSettimana`, `allenamentiCfg`, `allenamentiSchede`,
`catLabels`, `spesa`, `spesaCategories`, `spesaHistory`, `pantry`, `schedule`,
`spesaMeta`, `overrides`, `coachConfig`, `schedePdf/{prog}` (PDF base64 →
diventerà Storage), `training/activities`, `training/tracks`.
