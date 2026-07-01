-- ============================================================================
-- Dieta — schema Supabase (PostgreSQL), 3NF, grado produzione
-- Migration 0001 — initial schema
-- ============================================================================
-- Fase 2: migrazione backend Firebase RTDB -> Supabase. Eseguire nel SQL editor
-- di Supabase (o `supabase db push`). Idempotente (create ... if not exists /
-- guardie). Le migrazioni successive vanno in file numerati separati (0002_..).
--
-- Standard adottati (DBA-grade):
--  * 3NF: nessun fatto duplicato; liste/gerarchie come tabelle figlie con FK +
--    `ordinamento` per l'ordine del documento. Dati DERIVATI come colonne
--    GENERATED (es. attivita.mese/anno_sett da `data`), non memorizzati a mano.
--  * Integrità: FK con ON UPDATE/DELETE espliciti; CHECK (testi non vuoti,
--    numerici non negativi); domini stabili come ENUM o tabelle di lookup.
--  * Audit: created_at/updated_at su ogni tabella (updated_at via trigger).
--  * Indici: copertura automatica di TUTTE le colonne FK + indici di query.
--  * Sicurezza: RLS attiva ovunque; accesso solo ai membri (household).
--  * Documentazione: COMMENT ON su tabelle e colonne non ovvie (data dictionary).
--  * Due eccezioni motivate al 3NF puro (NON abuso di JSONB):
--     - attivita.extra jsonb: intervals.icu espone campi variabili non enumerabili.
--     - traccia.geo/altimetria jsonb: una polyline GPS è UN oggetto geometrico;
--       1-riga-per-punto sarebbe denormalizzazione inversa. Salite/lap: normalizzati.
-- ============================================================================

begin;

-- ── Enum (domini piccoli e stabili) ─────────────────────────────────────────
do $$ begin create type weekday_key      as enum ('dom','lun','mar','mer','gio','ven','sab'); exception when duplicate_object then null; end $$;
do $$ begin create type proprietario_tipo as enum ('persona','animale');                      exception when duplicate_object then null; end $$;
do $$ begin create type allegato_tipo     as enum ('pdf','video');                             exception when duplicate_object then null; end $$;
do $$ begin create type programma_key      as enum ('forza','tri');                            exception when duplicate_object then null; end $$;

-- ── Trigger riusabile: updated_at ───────────────────────────────────────────
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ============================================================================
-- 0. Membri (Supabase Auth gestisce le credenziali; qui l'anagrafica)
-- ============================================================================
create table if not exists membro (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome    text not null check (char_length(btrim(nome)) > 0),
  colore  text
);

-- ============================================================================
-- 1. Lookup / reference
-- ============================================================================
create table if not exists categoria_alimentare (
  key  text primary key check (key = lower(key) and char_length(key) > 0),
  pill text not null check (char_length(btrim(pill)) > 0)
);

create table if not exists disciplina (           -- domini allenamento controllati dall'app
  key  text primary key check (key = lower(key) and char_length(key) > 0),
  nome text not null check (char_length(btrim(nome)) > 0)
);

create table if not exists proprietario (         -- ex "owner" (parola chiave: evitata)
  key   text primary key check (key = lower(key) and char_length(key) > 0),
  tipo  proprietario_tipo not null,
  nome  text not null check (char_length(btrim(nome)) > 0),
  emoji text
);

create table if not exists spesa_categoria (
  key         text primary key check (key = lower(key) and char_length(key) > 0),
  emoji       text,
  nome        text not null check (char_length(btrim(nome)) > 0),
  ordinamento int  not null default 0,
  custom      boolean not null default false
);

-- ============================================================================
-- 2. Dieta base Nicholas (ex nicBase): day -> (integ) -> pasto -> item -> alt
-- ============================================================================
create table if not exists nic_day (
  id           text primary key check (char_length(id) > 0),
  label        text not null check (char_length(btrim(label)) > 0),
  ordinamento  int  not null default 0,
  pasto_libero text
);

create table if not exists nic_day_integ (
  id          bigint generated always as identity primary key,
  day_id      text not null references nic_day (id) on update cascade on delete cascade,
  tag         text not null check (char_length(btrim(tag)) > 0),
  valore      text not null check (char_length(btrim(valore)) > 0),
  ordinamento int  not null default 0
);

create table if not exists nic_pasto (
  id          bigint generated always as identity primary key,
  day_id      text not null references nic_day (id) on update cascade on delete cascade,
  icon        text,
  nome        text not null check (char_length(btrim(nome)) > 0),
  note        text,
  ordinamento int  not null default 0
);

create table if not exists nic_item (
  id            bigint generated always as identity primary key,
  pasto_id      bigint not null references nic_pasto (id) on delete cascade,
  categoria_key text   not null references categoria_alimentare (key) on update cascade,
  valore        text,               -- NULL sse la voce è "a scelta": le opzioni stanno in nic_item_alt
  ordinamento   int    not null default 0
);

create table if not exists nic_item_alt (
  id          bigint generated always as identity primary key,
  item_id     bigint not null references nic_item (id) on delete cascade,
  valore      text   not null check (char_length(btrim(valore)) > 0),
  ordinamento int    not null default 0
);

-- ============================================================================
-- 3. Dieta base Noemi (ex noemiBase): meal -> slot -> opt ; meal -> fixed
-- ============================================================================
create table if not exists noemi_meal (
  key         text primary key check (char_length(key) > 0),
  icon        text,
  nome        text not null check (char_length(btrim(nome)) > 0),
  ordinamento int  not null default 0
);

create table if not exists noemi_slot (
  id            bigint generated always as identity primary key,
  meal_key      text   not null references noemi_meal (key) on update cascade on delete cascade,
  categoria_key text   not null references categoria_alimentare (key) on update cascade,
  label         text   not null check (char_length(btrim(label)) > 0),
  ordinamento   int    not null default 0
);

create table if not exists noemi_slot_opt (
  id          bigint generated always as identity primary key,
  slot_id     bigint not null references noemi_slot (id) on delete cascade,
  valore      text   not null check (char_length(btrim(valore)) > 0),
  ordinamento int    not null default 0
);

create table if not exists noemi_fixed (
  id            bigint generated always as identity primary key,
  meal_key      text   not null references noemi_meal (key) on update cascade on delete cascade,
  categoria_key text   not null references categoria_alimentare (key) on update cascade,
  valore        text   not null check (char_length(btrim(valore)) > 0),
  ordinamento   int    not null default 0
);

-- ============================================================================
-- 4. Settimana libera Noemi (ex noemiSettimana)
-- ============================================================================
create table if not exists noemi_settimana (
  giorno weekday_key not null,
  chiave text        not null check (char_length(chiave) > 0),  -- meal key o 'dolcetto'
  testo  text        not null,
  primary key (giorno, chiave)
);

-- ============================================================================
-- 5. Allenamenti — programmi/schede (ex allenamentiSchede + allenamentiCfg)
-- ============================================================================
create table if not exists programma (
  key       programma_key primary key,
  nome      text not null check (char_length(btrim(nome)) > 0),
  coach     text,
  durata    int  check (durata is null or durata >= 0),
  note      text,
  obiettivi text
);

create table if not exists programma_week (
  id            bigint generated always as identity primary key,
  programma_key programma_key not null references programma (key) on delete cascade,
  titolo        text   not null check (char_length(btrim(titolo)) > 0),
  note          text,
  ordinamento   int    not null default 0
);

create table if not exists programma_sessione (
  id          bigint generated always as identity primary key,
  week_id     bigint not null references programma_week (id) on delete cascade,
  disc        text   references disciplina (key) on update cascade,  -- NULL = blocchi diretti (forza)
  nome        text,
  ordinamento int    not null default 0
);

create table if not exists programma_blocco (
  id           bigint generated always as identity primary key,
  sessione_id  bigint not null references programma_sessione (id) on delete cascade,
  nome         text   not null check (char_length(btrim(nome)) > 0),
  righe        text   not null default '',
  ordinamento  int    not null default 0
);

create table if not exists allenamenti_cfg (
  programma_key programma_key primary key references programma (key) on delete cascade,
  start_date    date,
  shift         int not null default 0
);

create table if not exists programma_allegato (   -- puntatore a Supabase Storage (bucket 'schede')
  id            bigint generated always as identity primary key,
  programma_key programma_key not null references programma (key) on delete cascade,
  tipo          allegato_tipo not null,
  storage_path  text not null check (char_length(btrim(storage_path)) > 0),
  unique (programma_key, tipo, storage_path)
);

-- ============================================================================
-- 6. Piano settimana Nicholas (ex schedule): 0..N discipline ordinate per giorno
-- ============================================================================
create table if not exists schedule_giorno (
  giorno      weekday_key not null,
  ordinamento int         not null default 0,
  disciplina  text        not null references disciplina (key) on update cascade,
  primary key (giorno, ordinamento)
);

-- ============================================================================
-- 7. Config coach (ex coachConfig) — singleton
-- ============================================================================
create table if not exists coach_config (
  id        boolean primary key default true check (id),
  obiettivo text,
  note      text
);

-- ============================================================================
-- 8. Spesa (ex spesa/pantry/spesaCategories/spesaHistory/spesaMeta)
-- ============================================================================
create table if not exists spesa_item (
  id            bigint generated always as identity primary key,
  categoria_key text    not null references spesa_categoria (key) on update cascade,
  testo         text    not null check (char_length(btrim(testo)) > 0),
  preso         boolean not null default false
);

create table if not exists spesa_item_proprietario (
  item_id          bigint not null references spesa_item (id) on delete cascade,
  proprietario_key text   not null references proprietario (key) on update cascade on delete cascade,
  primary key (item_id, proprietario_key)
);

create table if not exists dispensa_item (
  id            bigint generated always as identity primary key,
  categoria_key text    not null references spesa_categoria (key) on update cascade,
  testo         text    not null check (char_length(btrim(testo)) > 0),
  attivo        boolean not null default true
);

create table if not exists dispensa_item_proprietario (
  dispensa_id      bigint not null references dispensa_item (id) on delete cascade,
  proprietario_key text   not null references proprietario (key) on update cascade on delete cascade,
  primary key (dispensa_id, proprietario_key)
);

create table if not exists spesa_storico (         -- snapshot spesa fatta (per ripristino)
  id       bigint generated always as identity primary key,
  fatta_il timestamptz not null default now()
);

create table if not exists spesa_storico_voce (
  id            bigint generated always as identity primary key,
  storico_id    bigint not null references spesa_storico (id) on delete cascade,
  categoria_key text   references spesa_categoria (key) on update cascade,
  testo         text   not null check (char_length(btrim(testo)) > 0)
);

create table if not exists spesa_meta (            -- ultima modifica lista — singleton
  id            boolean primary key default true check (id),
  modificato_da text,
  modificato_il timestamptz
);

-- ============================================================================
-- 9. Allenamenti — attività + tracce (ex training/activities, training/tracks)
-- ============================================================================
create table if not exists attivita (
  id                    text primary key check (char_length(id) > 0),  -- id intervals.icu
  data                  date,
  -- derivati da `data` (3NF: non memorizzati a mano). NB: `to_char` è STABLE →
  -- non ammesso nelle GENERATED; uso `extract` (IMMUTABLE su date):
  mese      text generated always as (
              extract(year from data)::text || '-' || lpad(extract(month from data)::text, 2, '0')
            ) stored,
  anno_sett text generated always as (
              extract(isoyear from data)::text || '-W' || lpad(extract(week from data)::text, 2, '0')
            ) stored,
  disciplina            text,        -- dato esterno grezzo; conformare a `disciplina` in seguito
  tipo_garmin           text,
  nome                  text,
  durata_min            numeric(8,2)  check (durata_min   is null or durata_min   >= 0),
  distanza_km           numeric(8,3)  check (distanza_km  is null or distanza_km  >= 0),
  fc_media              numeric(5,1)  check (fc_media      is null or fc_media     >= 0),
  carico                numeric(8,2)  check (carico        is null or carico       >= 0),
  ctl                   numeric(6,2),
  atl                   numeric(6,2),
  velocita_bici_kmh     numeric(6,2),
  passo_corsa_min_km    text,
  passo_nuoto_min_100m  text,
  extra                 jsonb         -- campi variabili intervals.icu (vedi header)
);

create table if not exists traccia (
  attivita_id  text primary key references attivita (id) on delete cascade,
  versione     int,
  dislivello_m numeric(7,1),
  geo          jsonb,               -- polyline [[lat,lon],...] — oggetto geometrico
  altimetria   jsonb                -- profilo altimetrico [..] — oggetto geometrico
);

create table if not exists traccia_salita (
  id             bigint generated always as identity primary key,
  attivita_id    text   not null references attivita (id) on delete cascade,
  ordinamento    int    not null default 0,
  durata_s       numeric(8,1) check (durata_s is null or durata_s >= 0),
  pendenza_media numeric(5,2),
  pendenza_max   numeric(5,2),
  fc_media       numeric(5,1),
  cadenza        numeric(5,1),
  vam            numeric(7,1),
  velocita       numeric(6,2)
);

create table if not exists traccia_lap (
  id          bigint generated always as identity primary key,
  attivita_id text   not null references attivita (id) on delete cascade,
  ordinamento int    not null default 0,
  distanza_km numeric(8,3) check (distanza_km is null or distanza_km >= 0),
  durata_s    numeric(8,1) check (durata_s   is null or durata_s   >= 0),
  passo       text,
  velocita    numeric(6,2)
);

-- ============================================================================
-- 10. Audit (created_at/updated_at su OGNI tabella) + trigger updated_at
-- ============================================================================
do $$ declare t text; begin
  for t in select table_name from information_schema.tables
           where table_schema = 'public' and table_type = 'BASE TABLE' loop
    execute format('alter table public.%I add column if not exists created_at timestamptz not null default now();', t);
    execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now();', t);
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s;', t);
    execute format('create trigger trg_touch_%1$s before update on public.%1$s for each row execute function touch_updated_at();', t);
  end loop;
end $$;

-- ============================================================================
-- 11. Indici: copertura AUTOMATICA di tutte le colonne FK (evita lock/seq-scan
--     sui delete cascade e sui join) + indici di query mirati.
-- ============================================================================
do $$ declare r record; cols text; begin
  for r in
    select con.conname, con.conrelid::regclass::text as tbl,
           (select string_agg(quote_ident(a.attname), ',' order by k.ord)
              from unnest(con.conkey) with ordinality as k(attnum, ord)
              join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as cols
    from pg_constraint con
    where con.contype = 'f' and con.connamespace = 'public'::regnamespace
  loop
    execute format('create index if not exists %I on %s (%s);',
                   'ix_fk_' || substr(md5(r.tbl || r.conname), 1, 16), r.tbl, r.cols);
  end loop;
end $$;

create index if not exists ix_attivita_data       on attivita (data desc);
create index if not exists ix_attivita_disciplina on attivita (disciplina);
create index if not exists ix_attivita_mese       on attivita (mese);
create index if not exists ix_spesa_item_preso    on spesa_item (preso);

-- ============================================================================
-- 12. RLS — dati condivisi household: accesso pieno solo ai membri autenticati.
--     (La service_role di Supabase bypassa la RLS: usarla solo lato server.)
-- ============================================================================
create or replace function is_membro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membro m where m.user_id = auth.uid());
$$;
revoke all on function is_membro() from public;
grant execute on function is_membro() to authenticated;

do $$ declare t text; begin
  for t in select table_name from information_schema.tables
           where table_schema = 'public' and table_type = 'BASE TABLE' loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
    execute format('drop policy if exists membri_all on public.%I;', t);
    execute format(
      'create policy membri_all on public.%I for all to authenticated using (is_membro()) with check (is_membro());', t);
  end loop;
end $$;

-- ============================================================================
-- 13. Data dictionary (COMMENT) — tabelle e colonne non ovvie
-- ============================================================================
comment on table  membro                 is 'Utenti household (mappa auth.users -> anagrafica); base della RLS.';
comment on table  categoria_alimentare   is 'Categorie alimentari (ex CAT + override catLabels).';
comment on table  disciplina             is 'Discipline allenamento controllate dall''app (lookup).';
comment on table  proprietario           is 'Chi "possiede" una voce spesa (persone + animali). Ex nodo owner.';
comment on column nic_item.valore        is 'NULL quando la voce è "a scelta": le opzioni sono in nic_item_alt.';
comment on column programma_sessione.disc is 'NULL = blocchi diretti della forza; valorizzato per il triathlon.';
comment on column attivita.mese          is 'Derivato da data (generated): YYYY-MM.';
comment on column attivita.anno_sett     is 'Derivato da data (generated): settimana ISO IYYY-Www.';
comment on column attivita.extra         is 'Campi variabili intervals.icu non enumerabili (zone FC, ecc.).';
comment on column traccia.geo            is 'Polyline GPS come oggetto geometrico (JSONB): non normalizzato per punto.';

commit;

-- ============================================================================
-- FINE migration 0001. Prossimi passi:
--  * 0002: seed reference (categoria_alimentare, disciplina, proprietario,
--    spesa_categoria, programma) — o seed dal default hardcoded dell'app.
--  * Storage: bucket 'schede' (PDF) e 'schede-video'.
--  * Script di migrazione dati Firebase -> Supabase (one-shot, idempotente).
-- ============================================================================
