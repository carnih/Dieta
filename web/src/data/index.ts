import { FirebaseRepo } from '@/data/firebaseRepo';
import { SupabaseRepo } from '@/data/supabaseRepo';
import type { Repo } from '@/data/repo';
import { hasSupabase } from '@/lib/supabase';

/**
 * Singleton del data-layer — UNICO punto da cambiare per migrare backend.
 * Usa SupabaseRepo SOLO se il client è configurato E il flag esplicito
 * `VITE_USE_SUPABASE=true` è impostato → la produzione (senza flag) resta su
 * Firebase anche se le env Supabase fossero presenti. Nessun cambio accidentale.
 */
const useSupabase = hasSupabase() && import.meta.env.VITE_USE_SUPABASE === 'true';

export const repo: Repo = useSupabase ? new SupabaseRepo() : new FirebaseRepo();

export type { Repo, AuthUser } from '@/data/repo';
