import { FirebaseRepo } from '@/data/firebaseRepo';
import type { Repo } from '@/data/repo';

/**
 * Singleton del data-layer — UNICO punto da cambiare per migrare backend.
 * Fase 1: Firebase. Fase 2: sostituire con `new SupabaseRepo()`.
 */
export const repo: Repo = new FirebaseRepo();

export type { Repo, AuthUser } from '@/data/repo';
