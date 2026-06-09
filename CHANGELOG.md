# Changelog — Dieta

Storico delle modifiche significative all'app. Le voci più recenti in alto.
Formato libero: data — cosa è cambiato e perché.

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
