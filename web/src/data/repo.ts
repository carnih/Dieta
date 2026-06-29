// Contratto del data-layer, indipendente dal backend.
// Oggi: FirebaseRepo (Realtime DB + Auth). Domani: SupabaseRepo (Postgres + Auth +
// Storage) — basta cambiare il singleton in `@/data` senza toccare le viste/hook.

export interface AuthUser {
  uid: string;
  email: string | null;
}

export interface Repo {
  /** Sottoscrive lo stato di autenticazione. Ritorna la funzione di unsubscribe. */
  onAuthChange(cb: (user: AuthUser | null) => void): () => void;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;

  /** Sottoscrive un nodo/risorsa in tempo reale. Ritorna unsubscribe. */
  subscribe(path: string, cb: (val: unknown) => void): () => void;
  /** Lettura one-shot. */
  get<T = unknown>(path: string): Promise<T | null>;
  /** Scrittura (upsert) con gestione errori reale. */
  set(path: string, val: unknown): Promise<void>;
}
