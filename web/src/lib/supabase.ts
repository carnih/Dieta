// supabase.ts — client Supabase singleton (stesso pattern di NetWorth).
//
// Costruito dalle env Vite `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
// Se mancano, `supabase` è null e `hasSupabase()` è false → l'app resta sul path
// Firebase attuale (nessun impatto finché non si fa lo switch del repo).
//
// Unico posto che legge le env / costruisce il client, così non nascono due
// istanze GoTrue che litigano sulla sessione in localStorage.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

/** `true` quando entrambe le env Supabase sono presenti e non vuote. */
export function hasSupabase(): boolean {
  return url.length > 0 && anonKey.length > 0;
}

/** Client condiviso, oppure null se Supabase non è configurato. */
export const supabase: SupabaseClient | null = hasSupabase()
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Ritorna il client o lancia se Supabase non è configurato. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase non configurato: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY mancanti.',
    );
  }
  return supabase;
}
