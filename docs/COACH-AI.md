# COACH-AI — piano "assistente allenamenti"

Obiettivo: un assistente che legge i dati di allenamento (in continuo aggiornamento) e
aiuta a interpretarli nel lungo periodo, in ottica preparazione **Ironman 70.3**.

## Stato attuale (giugno 2026)
- ✅ **Storico**: export Garmin "Esporta i tuoi dati" — 272 attività (~8 mesi).
  File chiave nell'export: `DI_CONNECT/DI-Connect-Fitness/..._summarizedActivities.json` (riepilogo strutturato, ~2 MB).
  Metriche per attività: durata, distanza, passo/velocità, FC media/max/min, minuti per zona FC,
  carico (`activityTrainingLoad`), training effect aero/anaero, VO₂max, potenza, dinamica corsa,
  nuoto (SWOLF/bracciate/vasca), RPE/feel, GPS, splits.
- ✅ **Ordinario**: API Strava validata (Garmin→Strava sync attivo da 10/06/2026, solo in avanti).
  App Strava: **Client ID 256950**, scope `activity:read_all`. Client Secret/refresh: NON in repo;
  da **rigenerare** prima dell'automazione permanente e salvare come GitHub Secrets.
- ✅ **App**: login email/password (2 account) + Realtime Database chiuso all'allowlist email.

## Architettura prevista
```
Garmin export (storico, 1x) ┐
                            ├─→ normalizzazione → Firebase training/ → dashboard + chat
Strava API (ordinario, auto)┘
```
- `training/activities/{id}` — attività normalizzate (unità pulite, dedup per id).
- `training/rollups` — aggregati settimanali/mensili (volume, carico, passo@FC, zone, VO₂max).
- `training/insights/{periodo}` — riepiloghi scritti dall'AI.

## Come ci si "chatta" (3 strade)
- **A. File caricato a mano** in ChatGPT/Claude/Gemini → gratis (abbonamento), ma è uno snapshot (non si aggiorna).
- **B. Endpoint vivo + connettore** (GPT personalizzato / MCP) → automatico + aggiornato, gratis con abbonamento, serve costruire un piccolo endpoint che legge Firebase.
- **C. "Chiedi al coach" dentro l'app** (API LLM) → automatico, comodo sul telefono, costo a consumo (centesimi).
- Nota: l'AI non vede l'app/Firebase da sola; o legge un file (A) o chiama un endpoint vivo (B/C).
  La "freschezza" dei dati la garantisce la sync Strava→Firebase.

## Roadmap
1. **Normalizzazione storico** → dataset pulito (CSV+JSON). Base per tutto + file per chat manuale (Strada A). [in corso]
2. **Firebase + sync Strava** (GitHub Action giornaliero, secrets rigenerati).
3. **Dashboard** (nuova tab "Analisi", Chart.js).
4. **Chat sempre aggiornata** (Strada B; eventuale C in-app).

## Decisioni prese
- Aggiornamento ordinario: **Strava automatico** (testato OK).
- AI: **si parte manuale/gratis** (Strada A); automazione (B/C) valutata dopo.
- Dashboard: **dentro l'app attuale** (nuova tab), quando si arriva allo Step 3.

## Sicurezza / privacy
- Dati di salute → sotto Firebase già protetto dai 2 account.
- Export grezzi e segreti (Strava secret/refresh, eventuali chiavi servizio) → MAI nel repo. Usare `.gitignore` + GitHub Secrets.
- API LLM: i dati inviati non vengono usati per training (impostazione API di Anthropic/OpenAI).
