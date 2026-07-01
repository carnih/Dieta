-- Migration 0007 — Storage per i PDF delle schede (bucket privato 'schede').
-- Accesso solo ai membri (stessa regola della RLS sulle tabelle).
begin;

insert into storage.buckets (id, name, public)
values ('schede', 'schede', false)
on conflict (id) do nothing;

drop policy if exists schede_membri on storage.objects;
create policy schede_membri on storage.objects
  for all to authenticated
  using (bucket_id = 'schede' and public.is_membro())
  with check (bucket_id = 'schede' and public.is_membro());

commit;
