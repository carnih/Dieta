# CLAUDE.md — Contesto progetto "Dieta"

> Questo file viene letto automaticamente da Claude Code all'inizio di ogni sessione
> in questa cartella. Serve a non perdere il contesto se una chat viene chiusa o cancellata.
> **Tienilo aggiornato** quando cambia l'architettura o aggiungi funzioni importanti.

## Cos'è
Web-app privata mobile-first per consultare e pianificare:
- la **dieta** di Nicholas e Noemi,
- i **piani di allenamento** (forza + triathlon),
- la **lista della spesa** condivisa.

Sito live: https://dietacarstr.netlify.app/

## Architettura (volutamente minimale — NON aggiungere build/framework senza motivo)
- **Un solo file**: `index.html` (~128KB) contiene HTML + CSS + JS (vanilla, ES module).
  Nessun bundler, nessun npm, nessuna dipendenza locale. Firebase importato via CDN.
- **Dati**: Firebase Realtime Database, progetto `dieta-b7804` (region europe-west1).
  Config in chiaro in `index.html` (~riga 621). Sync realtime con `onValue` (lettura) e `set` (scrittura).
- **Hosting**: Netlify, deploy automatico ad ogni push su `main`. Le modifiche AL CODICE
  richiedono push; le modifiche AI CONTENUTI (fatte nell'app) vanno su Firebase e NON richiedono ripubblicazione.
- **Healthcheck**: `.github/workflows/healthcheck.yml` — GitHub Actions, ~07:00 ogni giorno,
  verifica che il sito sia raggiungibile e che il blocco JS non sia rotto (parentesi/backtick bilanciati).
  Manda email solo in caso di problema.

## Le 5 tab (funzione di render in index.html)
1. 🍽️ Dieta / oggi  → `renderOggi()`        — vista del giorno con i pasti di entrambi
2. 🏃 Nicholas       → `renderNicholasTab()` — piano per tipo di allenamento (corsa/bici/palestra)
3. 🍓 Noemi          → `renderNoemiTab()`     — piano settimanale per giorno
4. 🛒 Spesa          → `renderSpesaTab()`     — lista per categorie, drag&drop, storico, proprietari
5. 🏋️ Allenamenti    → `renderAllenamentiTab()` — programmi con settimana corrente calcolata
Navigazione: `setTab(id)`. Render globale: `renderContent()`.

## Nodi Firebase (database)
`nicBase`, `noemiBase`, `noemiSettimana`, `allenamentiCfg`, `catLabels`,
`spesa`, `spesaHistory`, `spesaCategories`, `pantry`, `schedule`.
I default (costanti `NICHOLAS`, `NOEMI_BASE`, `ALLENAMENTI`, ecc.) sono hardcoded nel JS
e scritti su Firebase al primo avvio se il nodo è vuoto.

## Sicurezza (login + regole Firebase)
- L'app richiede **login** (Firebase Auth, email/password) prima di partire. Account condiviso tra i 2 utenti.
  Login persistente: si digita una volta per dispositivo. Gate in fondo allo `<script>` (`onAuthStateChanged`).
- Provider da abilitare in console: **Authentication › Sign-in method › Email/Password**.
- Le regole del Realtime Database DEVONO restare chiuse all'email in allowlist (NON `".read":true`):
  ```json
  {
    "rules": {
      ".read":  "auth != null && auth.token.email == 'EMAIL@esempio.it'",
      ".write": "auth != null && auth.token.email == 'EMAIL@esempio.it'"
    }
  }
  ```
  (Per due account separati: `auth.token.email == 'a@x' || auth.token.email == 'b@y'`.)
  Nota: `auth != null` da solo NON basta — con la apiKey pubblica chiunque può crearsi un account;
  per questo si vincola all'email specifica.

## Helper chiave (da riusare, non reinventare)
- `dbSet(path, val)` — **unico** modo per scrivere su Firebase. Gestisce gli errori (toast).
  NON usare `set(ref(db,...))` diretto: il `set()` async non va in try/catch sincrono.
- `esc(s)` — escaping per HTML, copre anche `"` e `'`. Usarlo SEMPRE su dati utente nei template literal.
- `addSpesaItem(cat, t, owners)` — aggiunge una voce spesa con dedup case-insensitive.
- `SUBS` (vicino all'init) — tabella dichiarativa delle sottoscrizioni Firebase: per aggiungere
  un nodo basta una riga `[path, assegna(value), quando-rirenderizzare()]`.

## Categorie alimenti
Definite in `const CAT` (~riga 635): carbo, prot, frutta, latte, grasso, sfizio,
verdura, bevanda, olio, integra, scegli, altro. Etichette personalizzabili via `catLabels`.

## File privati (NON committare)
`file origine/` = scan PDF/foto del nutrizionista. Già escluso in `.gitignore`.
Anche `.claude/` è in `.gitignore`.

## Sviluppo locale
- Server statico: `python -m http.server 3456` (vedi `.claude/launch.json`).
- Aprire `http://localhost:3456`. L'app usa il Firebase di produzione: attenzione a non sporcare i dati reali.

## Convenzioni di stile da rispettare
- Vanilla JS compatto, niente librerie nuove se evitabile.
- CSS con variabili in `:root` (palette `--n` blu = Nicholas, `--e` rosa = Noemi, `--grn` verde = spesa).
- Mantenere il file singolo e autosufficiente.
- Dopo modifiche al JS verificare che parentesi e backtick restino bilanciati (lo controlla anche l'healthcheck).

## Workflow modifiche
1. Modificare `index.html`.
2. (Consigliato) provare in locale col server statico.
3. Commit + push su `main` → Netlify pubblica da solo.

## CHANGELOG
Vedi `CHANGELOG.md` per lo storico delle modifiche significative.
