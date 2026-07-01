-- Migration 0004 — tabella per gli "override pasto libero" (nodo Firebase `overrides`).
-- overrides/{YYYY-MM-DD}/{pasto}/{e|n} = true  (e=Noemi, n=Nicholas). Transitori.
begin;

create table if not exists override_pasto (
  data       date not null,
  pasto      text not null check (char_length(pasto) > 0),
  persona    text not null check (persona in ('e', 'n')),  -- e = Noemi, n = Nicholas
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (data, pasto, persona)
);

create trigger trg_touch_override_pasto before update on override_pasto
  for each row execute function touch_updated_at();

alter table override_pasto enable row level security;
alter table override_pasto force row level security;
drop policy if exists membri_all on override_pasto;
create policy membri_all on override_pasto for all to authenticated
  using (is_membro()) with check (is_membro());

comment on table override_pasto is 'Pasto libero/fuori per data e persona (ex nodo overrides). e=Noemi, n=Nicholas.';

commit;
