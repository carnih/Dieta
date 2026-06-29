// Logica settimana DOMENICA → SABATO, portata fedele dal monolite index.html.
// `getDay()`: 0 = domenica … 6 = sabato.

import type { WeekdayKey } from '@/lib/types';

/** Ordine giorni della settimana: domenica → sabato (come nel monolite). */
export const NOEMI_DAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'] as const;

/** Etichette brevi per giorno. */
export const NOEMI_LABELS: Record<WeekdayKey, string> = {
  lun: 'Lun',
  mar: 'Mar',
  mer: 'Mer',
  gio: 'Gio',
  ven: 'Ven',
  sab: 'Sab',
  dom: 'Dom',
};

/** Etichette estese per giorno. */
export const NOEMI_FULL: Record<WeekdayKey, string> = {
  lun: 'Lunedì',
  mar: 'Martedì',
  mer: 'Mercoledì',
  gio: 'Giovedì',
  ven: 'Venerdì',
  sab: 'Sabato',
  dom: 'Domenica',
};

/** Id del giorno corrente (`getDay`: 0=dom … 6=sab). */
export function todayId(): WeekdayKey {
  return NOEMI_DAYS[new Date().getDay()];
}

/** Un giorno della griglia settimanale (ancorata alla domenica). */
export interface WeekDate {
  id: WeekdayKey;
  label: string;
  num: number;
  obj: Date;
}

/** Date della settimana corrente, ancorata alla domenica (come `weekDates()`). */
export function weekDates(): WeekDate[] {
  const now = new Date();
  const dow = now.getDay(); // 0 = domenica
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - dow);
  return NOEMI_DAYS.map((id, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return { id, label: NOEMI_LABELS[id], num: d.getDate(), obj: d };
  });
}

/**
 * Lunedì della settimana che contiene `d` (normalizzato a mezzanotte).
 * Identico a `mondayOf()` del monolite — usato anche dalla logica programmi.
 */
export function mondayOf(d: Date | string | number): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - dow);
  return x;
}

/** Data estesa in IT con iniziale maiuscola (come `fmtFull()`). */
export function fmtFull(d: Date): string {
  const s = d.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
