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

// ──────────────────────────────────────────────────────────────────────────
//  DIETA — categorie e pasti
// ──────────────────────────────────────────────────────────────────────────

/** Chiavi categoria alimentare (nodo `CAT` del monolite). */
export type CategoriaKey =
  | 'carbo'
  | 'prot'
  | 'frutta'
  | 'latte'
  | 'grasso'
  | 'sfizio'
  | 'verdura'
  | 'bevanda'
  | 'olio'
  | 'integra'
  | 'scegli'
  | 'altro';

/** Definizione di una categoria (etichetta "pill"). */
export interface Categoria {
  pill: string;
}

/**
 * Voce di un pasto: valore fisso (`v`) oppure alternative (`alts`).
 * Stessa forma del monolite (almeno uno tra `v`/`alts` è presente).
 */
export interface DietItem {
  cat: CategoriaKey;
  v?: string;
  alts?: string[];
}

/** Integrazione: pre/post oppure lista multipla con tag. */
export interface Integ {
  pre?: string;
  post?: string;
  multi?: { tag: string; v: string }[];
}

/** Un pasto della dieta di Nicholas. */
export interface DietPasto {
  icon: string;
  nome: string;
  note?: string;
  items: DietItem[];
}

/** Un "tipo di giornata" della dieta di Nicholas (corsa/bici/…/riposo). */
export interface DietDay {
  id: string;
  label: string;
  integ?: Integ;
  pastoLibero?: string;
  pasti: DietPasto[];
}

/** Dieta base di Nicholas (nodo `nicBase` / default `NICHOLAS`). */
export interface NicholasDiet {
  days: DietDay[];
}

// ──────────────────────────────────────────────────────────────────────────
//  DIETA — Noemi (dieta base con slot a scelta)
// ──────────────────────────────────────────────────────────────────────────

/** Slot a scelta multipla dentro un pasto di Noemi. */
export interface NoemiSlot {
  key: string;
  cat: CategoriaKey;
  label: string;
  opts: string[];
}

/** Voce fissa (non a scelta) di un pasto di Noemi. */
export interface NoemiFixed {
  cat: CategoriaKey;
  v: string;
}

/** Un pasto della dieta base di Noemi. */
export interface NoemiMeal {
  icon: string;
  nome: string;
  slots: NoemiSlot[];
  fixed: NoemiFixed[];
}

/** Dieta base di Noemi (nodo `noemiBase` / default `NOEMI_BASE`). */
export type NoemiBase = Record<string, NoemiMeal>;

// ──────────────────────────────────────────────────────────────────────────
//  ALLENAMENTI — programmi (forza + triathlon)
// ──────────────────────────────────────────────────────────────────────────

/** Blocco di una sessione (nome + righe di lavoro). */
export interface Blocco {
  nome: string;
  righe: string;
}

/** Sessione di allenamento (disciplina + blocchi); `nome` opzionale. */
export interface Sessione {
  disc: string;
  nome?: string;
  blocchi: Blocco[];
}

/**
 * Settimana di un programma. La forza usa `blocchi` diretti; il triathlon usa
 * `sessioni`. `note` opzionale (es. CHO/h nei brick).
 */
export interface Week {
  titolo: string;
  note?: string;
  blocchi?: Blocco[];
  sessioni?: Sessione[];
}

/** Un programma di allenamento (forza o tri). */
export interface Programma {
  nome: string;
  coach: string;
  durata: number;
  note?: string;
  obiettivi?: string;
  weeks: Week[];
}

/** Insieme dei programmi (nodo `allenamentiSchede` / default `ALLENAMENTI`). */
export interface Allenamenti {
  forza: Programma;
  tri: Programma;
}

/** Config di un programma (nodo `allenamentiCfg/{prog}`). */
export interface AlProgCfg {
  start: string; // YYYY-MM-DD
  shift: number;
}

/** Config allenamenti completa (nodo `allenamentiCfg`). */
export type AllenamentiCfg = Partial<Record<'forza' | 'tri', Partial<AlProgCfg>>>;

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
