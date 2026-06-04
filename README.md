# Dieta — Nicholas & Noemi

Web-app privata per consultare e pianificare le diete di Nicholas e Noemi.

- **Singolo file**: `index.html` (autosufficiente, dati su Firebase Realtime Database)
- **Hosting**: Netlify (deploy automatico ad ogni push su `main`)
- I contenuti (piano allenamenti, scelte pasti, ricette, dieta base) si salvano su Firebase e si sincronizzano tra i dispositivi — non richiedono ripubblicazione.
- Una modifica al **codice** (`index.html`) viene pubblicata automaticamente da Netlify dopo il push.

> I file in `file origine/` (scan del nutrizionista) sono privati ed esclusi dal repository.
