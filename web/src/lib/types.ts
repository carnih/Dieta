// Modello dati Firebase (Realtime DB) dell'app Dieta.
// Tipizzato progressivamente man mano che le feature vengono migrate; i nodi
// ancora "grezzi" restano come Record finché non si porta la relativa vista.

/** Attività di allenamento (nodo `training/activities/{id}`, fonte intervals.icu). */
export interface Activity {
  id?: string;
  data?: string; // YYYY-MM-DD
  mese?: string; // YYYY-MM
  anno_sett?: string; // YYYY-Www
  disciplina?: string;
  tipo_garmin?: string;
  nome?: string;
  durata_min?: number;
  distanza_km?: number;
  fc_media?: number;
  carico?: number;
  ctl?: number;
  atl?: number;
  velocita_bici_kmh?: number;
  passo_corsa_min_km?: string;
  passo_nuoto_min_100m?: string;
  [k: string]: unknown; // campi extra (zone, ecc.) finché non tipizzati
}

/** Piano settimanale (nodo `schedule`): per ogni giorno, id disciplina o lista. */
export type Schedule = Partial<Record<WeekdayKey, string | string[]>>;
export type WeekdayKey = 'lun' | 'mar' | 'mer' | 'gio' | 'ven' | 'sab' | 'dom';

/** Config coach (nodo `coachConfig`). */
export interface CoachConfig {
  obiettivo?: string;
  note?: string;
}

/** Meta ultima modifica spesa (nodo `spesaMeta`). */
export interface SpesaMeta {
  by?: string;
  at?: number; // epoch ms
}

/** Snapshot completo dello store (i nodi sottoscritti in tempo reale). */
export interface StoreState {
  training: Activity[];
  schedule: Schedule;
  coachConfig: CoachConfig;
  spesaMeta: SpesaMeta | null;
  // Nodi ancora grezzi: tipizzati quando si migra la relativa vista.
  nicBase: unknown;
  noemiBase: unknown;
  noemiSettimana: unknown;
  allenamentiCfg: unknown;
  catLabels: Record<string, string>;
  spesa: unknown;
  spesaCategories: unknown;
  spesaHistory: unknown;
  pantry: unknown;
  overrides: unknown;
}
