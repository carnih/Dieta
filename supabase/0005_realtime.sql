-- Migration 0005 — abilita il Realtime (postgres_changes) su tutte le tabelle.
-- Così le sottoscrizioni del SupabaseRepo si aggiornano dal vivo (come Firebase).
-- Idempotente: salta le tabelle già nella publication.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
