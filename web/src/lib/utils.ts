// Helper puri portati FEDELMENTE dal monolite index.html.
// Nessuna dipendenza dallo stato globale: funzioni pure riusabili dalle viste.

/**
 * Escaping HTML (incl. virgolette). Stesso comportamento di `esc()` del monolite.
 * In React di norma non serve (JSX fa l'escape), ma resta utile per
 * attributi/markup costruiti a mano o per parità di comportamento.
 */
export function esc(s: unknown): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Formatta minuti (decimali) → `m:ss`. Identico a `mmss()` del monolite. */
export function mmss(x: number): string {
  const m = Math.floor(x);
  const s = Math.round((x - m) * 60);
  return m + ':' + (s < 10 ? '0' + s : s);
}

/** Parse numerico tollerante: NaN → 0 (come `_n()` del monolite). */
export function num(v: unknown): number {
  const x = parseFloat(String(v));
  return isNaN(x) ? 0 : x;
}

/** Numero intero in formato italiano (separatore migliaia). */
export function fmt0(n: number): string {
  return num(n).toLocaleString('it-IT', { maximumFractionDigits: 0 });
}

/** Numero in formato italiano con un decimale (virgola decimale IT). */
export function fmt(n: number): string {
  return num(n).toLocaleString('it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Percentuale intera (0–100) da una frazione 0..1, arrotondata. */
export function pct(x: number): number {
  return Math.round(num(x) * 100);
}

/** Combina classi (stringhe / condizioni falsy ignorate). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Data/ora compatta in formato IT — come `fmtWhen()` del monolite
 * (es. "29/06, 14:05"). Accetta epoch ms o qualsiasi input di `Date`.
 */
export function fmtWhen(ts: number | string | Date): string {
  try {
    return new Date(ts).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Data → stringa ISO `YYYY-MM-DD` in fuso locale (come `isoDate()` del monolite). */
export function isoDate(date: Date | string | number): string {
  const x = new Date(date);
  return (
    x.getFullYear() +
    '-' +
    String(x.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(x.getDate()).padStart(2, '0')
  );
}
