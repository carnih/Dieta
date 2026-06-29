// Tipi LOCALI della vista Spesa (portati fedeli dai nodi del monolite index.html).
// I nodi store corrispondenti (`spesa`, `spesaCategories`, `spesaHistory`, `pantry`)
// sono `unknown` in @/lib/types finché non si tipizza globalmente: qui li narrow-iamo
// localmente con i tipi reali usati dal monolite, senza ridefinire helper condivisi.

/** Un articolo della lista spesa (nodo `spesa/{cat}` = array di Item). */
export interface SpesaItem {
  t: string; // testo articolo
  d?: boolean; // "done" / spuntato
  owners?: string[]; // ['nicholas','noemi','gatto','coniglio']
}

/** Una voce in dispensa (nodo `pantry` = array di PantryItem). */
export interface PantryItem {
  t: string;
  owners?: string[];
  cat?: string; // categoria di provenienza
  active?: boolean; // false = nascosta dalle viste non-dispensa
}

/** Definizione categoria persistita (nodo `spesaCategories/{key}`). */
export interface SpesaCatDef {
  label?: string;
  order?: number;
}

/** Categoria risolta (default + custom), come ritorna `getSpesaCats()`. */
export interface SpesaCat {
  key: string;
  label: string;
  order: number;
  custom: boolean;
}

/** Snapshot di una spesa fatta (nodo `spesaHistory/{ts}`). */
export interface SpesaHistorySnap {
  date?: string;
  items?: Record<string, SpesaItem[]>;
}

/** Mappe dei nodi grezzi, narrow-ate dai valori `unknown` dello store. */
export type SpesaMap = Record<string, SpesaItem[]>;
export type SpesaCategoriesMap = Record<string, SpesaCatDef>;
export type SpesaHistoryMap = Record<string, SpesaHistorySnap>;
