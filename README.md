# Dieta — Nicholas & Noemi

Web-app privata mobile-first per due persone: **dieta**, **allenamenti** (con dashboard analitica e coach AI) e **lista della spesa** condivisa.

🔗 **Live:** https://dieta-livid.vercel.app/ (accesso con login)

## Cosa fa
- 🍽️ **Dieta** — confronto pasti del giorno, pianificazione settimanale, "pasto libero" per persona e per data.
- 🏋️ **Allenamenti** — schede + **dashboard**: volume per disciplina, ore settimanali medie e loro progressione, carico, zone FC, e **dettaglio singola attività** con mappa, profilo altimetrico, salite e lap.
- 🤖 **Coach AI** — un GPT personalizzato interroga i dati di allenamento (storico + settimana + piano) tramite un endpoint dedicato.
- 🛒 **Spesa** — lista condivisa con categorie, drag&drop e storico.

## Come è fatta
- **Single-file**: `index.html` — HTML+CSS+JS vanilla (ES module), nessun build/framework. Firebase, Chart.js e Leaflet via CDN.
- **Dati**: Firebase Realtime Database (login email/password, regole chiuse all'allowlist).
- **Hosting**: **Vercel**, deploy automatico ad ogni push su `main`. Funzioni serverless in `api/`.
- **Pipeline allenamenti**: Garmin → **intervals.icu** → GitHub Action (`.github/`) → Firebase.

## Sicurezza
Nessun segreto nel repo: tutte le credenziali stanno nei **GitHub Secrets** e nelle **env di Vercel**. La `apiKey` Firebase è pubblica per design (la protezione è data dalle regole del database).

## Documentazione
- [`CLAUDE.md`](CLAUDE.md) — contesto tecnico completo (architettura, nodi Firebase, helper).
- [`docs/COACH-AI.md`](docs/COACH-AI.md) — design e stato del coach AI.
- [`CHANGELOG.md`](CHANGELOG.md) — storico delle modifiche.
