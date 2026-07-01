-- ============================================================================
-- Dieta — schema Supabase (PostgreSQL), 3NF
-- ============================================================================
-- Fase 2: migrazione backend Firebase RTDB -> Supabase. Questo file crea TUTTO
-- lo schema relazionale. Eseguire nel SQL editor di Supabase (o via psql) sul
-- progetto nuovo. Idempotente: usa "create ... if not exists" dove possibile.
--
-- Principi:
--  * 3NF: ogni fatto in un solo posto; liste/gerarchie come tabelle figlie con
--    FK + colonna `ordinamento` (int) per preservare l'ordine del documento.
--  * Naming: snake_case italiano coerente con l'app; PK `id bigint generated
--    always as identity` salvo entità con chiave naturale stabile (es. giorni,
--    programmi, categorie).
--  * Due eccezioni pragmatiche al 3NF puro (motivate, NON abuso di JSONB):
--     1) `attivita.extra jsonb` — intervals.icu espone campi arbitrari/variabili
--        (zone FC, metriche extra) non conoscibili a priori: le colonne note sono
--        tipizzate, il resto resta in `extra`. Le zone si potranno normalizzare
--        in `attivita_zona` quando il set sarà stabile.
--     2) `traccia.geo`/`traccia.altimetria jsonb` — una polyline GPS è UN valore
--        geometrico (un oggetto), non dati relazionali: normalizzarla a
--        1-riga-per-punto (milioni di righe) non è 3NF sensato ma denormalizzazione
--        inversa. Salite e lap (poche righe, relazionali) SONO normalizzati.
-- ============================================================================

-- ── Enum condivisi ─────────────────────────────────────────────────────────
do $$ begin
  create type weekday_key as enum ('dom','lun','mar','mer','gio','ven','sab');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 0. Membri (auth) — Supabase Auth gestisce le credenziali; qui l'anagrafica.
-- ============================================================================
create table if not exists membro (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome    text not null,
  colore  text
);

-- ============================================================================
-- 1. Categorie alimentari (ex CAT + catLabels)
-- ============================================================================
create table if not exists categoria_alimentare (
  key  text primary key,          -- 'carbo','prot','frutta',...
  pill text not null               -- etichetta mostrata (override di catLabels incluso)
);

-- ============================================================================
-- 2. Dieta base Nicholas (ex nicBase)
--    day -> (integ) -> pasto -> item -> alt
-- ============================================================================
create table if not exists nic_day (
  id           text primary key,   -- 'corsa','bici','riposo',...
  label        text not null,
  ordinamento  int  not null default 0,
  pasto_libero text
);

create table if not exists nic_day_integ (
  id          bigint generated always as identity primary key,
  day_id      text not null references nic_day (id) on delete cascade,
  tag         text not null,       -- 'Pre','Post' o tag della lista multipla
  valore      text not null,
  ordinamento int  not null default 0
);

create table if not exists nic_pasto (
  id          bigint generated always as identity primary key,
  day_id      text not null references nic_day (id) on delete cascade,
  icon        text,
  nome        text not null,
  note        text,
  ordinamento int  not null default 0
);

create table if not exists nic_item (
  id            bigint generated always as identity primary key,
  pasto_id      bigint not null references nic_pasto (id) on delete cascade,
  categoria_key text   not null references categoria_alimentare (key),
  valore        text,               -- null quando la voce è "a scelta" (vedi nic_item_alt)
  ordinamento   int    not null default 0
);

create table if not exists nic_item_alt (
  id          bigint generated always as identity primary key,
  item_id     bigint not null references nic_item (id) on delete cascade,
  valore      text   not null,
  ordinamento int    not null default 0
);

-- ============================================================================
-- 3. Dieta base Noemi (ex noemiBase)
--    meal -> slot -> opt ; meal -> fixed
-- ============================================================================
create table if not exists noemi_meal (
  key         text primary key,     -- chiave pasto (colazione, pranzo, ...)
  icon        text,
  nome        text not null,
  ordinamento int  not null default 0
);

create table if not exists noemi_slot (
  id            bigint generated always as identity primary key,
  meal_key      text   not null references noemi_meal (key) on delete cascade,
  categoria_key text   not null references categoria_alimentare (key),
  label         text   not null,
  ordinamento   int    not null default 0
);

create table if not exists noemi_slot_opt (
  id          bigint generated always as identity primary key,
  slot_id     bigint not null references noemi_slot (id) on delete cascade,
  valore      text   not null,
  ordinamento int    not null default 0
);

create table if not exists noemi_fixed (
  id            bigint generated always as identity primary key,
  meal_key      text   not null references noemi_meal (key) on delete cascade,
  categoria_key text   not null references categoria_alimentare (key),
  valore        text   not null,
  ordinamento   int    not null default 0
);

-- ============================================================================
-- 4. Settimana libera Noemi (ex noemiSettimana): testo per giorno/chiave-pasto
-- ============================================================================
create table if not exists noemi_settimana (
  giorno weekday_key not null,
  chiave text        not null,      -- meal key oppure 'dolcetto'
  testo  text        not null,
  primary key (giorno, chiave)
);

-- ============================================================================
-- 5. Allenamenti — programmi/schede (ex allenamentiSchede + allenamentiCfg)
--    programma -> week -> sessione -> blocco
--    Forza: la settimana ha blocchi "diretti" -> modellati come UNA sessione
--    con disciplina NULL. Tri: più sessioni, ciascuna con `disc`.
-- ============================================================================
create table if not exists programma (
  key       text primary key,       -- 'forza' | 'tri'
  nome      text not null,
  coach     text,
  durata    int,
  note      text,
  obiettivi text
);

create table if not exists programma_week (
  id            bigint generated always as identity primary key,
  programma_key text   not null references programma (key) on delete cascade,
  titolo        text   not null,
  note          text,
  ordinamento   int    not null default 0
);

create table if not exists programma_sessione (
  id          bigint generated always as identity primary key,
  week_id     bigint not null references programma_week (id) on delete cascade,
  disc        text,                 -- NULL = blocchi diretti della forza
  nome        text,
  ordinamento int    not null default 0
);

create table if not exists programma_blocco (
  id           bigint generated always as identity primary key,
  sessione_id  bigint not null references programma_sessione (id) on delete cascade,
  nome         text   not null,
  righe        text   not null default '',
  ordinamento  int    not null default 0
);

create table if not exists allenamenti_cfg (
  programma_key text primary key references programma (key) on delete cascade,
  start_date    date,
  shift         int  not null default 0
);

-- Allegati schede (PDF/video) -> Supabase Storage (bucket 'schede'); qui il puntatore.
create table if not exists programma_allegato (
  id            bigint generated always as identity primary key,
  programma_key text   not null references programma (key) on delete cascade,
  tipo          text   not null check (tipo in ('pdf','video')),
  storage_path  text   not null,
  caricato_il   timestamptz not null default now()
);

-- ============================================================================
-- 6. Piano settimana Nicholas (ex schedule): 0..N discipline ordinate per giorno
-- ============================================================================
create table if not exists schedule_giorno (
  giorno      weekday_key not null,
  ordinamento int         not null default 0,
  disciplina  text        not null,
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
create table if not exists owner (
  key   text primary key,           -- 'nicholas','noemi','gatto','coniglio'
  tipo  text not null check (tipo in ('persona','animale')),
  nome  text not null,
  emoji text
);

create table if not exists spesa_categoria (
  key         text primary key,     -- 'panetteria','cereali',...
  emoji       text,
  nome        text not null,
  ordinamento int  not null default 0,
  custom      boolean not null default false
);

create table if not exists spesa_item (
  id            bigint generated always as identity primary key,
  categoria_key text   not null references spesa_categoria (key),
  testo         text   not null,
  preso         boolean not null default false,
  creato_il     timestamptz not null default now()
);

create table if not exists spesa_item_owner (
  item_id   bigint not null references spesa_item (id) on delete cascade,
  owner_key text   not null references owner (key) on delete cascade,
  primary key (item_id, owner_key)
);

create table if not exists dispensa_item (
  id            bigint generated always as identity primary key,
  categoria_key text   not null references spesa_categoria (key),
  testo         text   not null,
  attivo        boolean not null default true
);

create table if not exists dispensa_item_owner (
  dispensa_id bigint not null references dispensa_item (id) on delete cascade,
  owner_key   text   not null references owner (key) on delete cascade,
  primary key (dispensa_id, owner_key)
);

-- Storico spese fatte (snapshot per ripristino). Le voci storiche NON tracciano
-- gli owner (dato storico, ricostruibile) per non moltiplicare le righe.
create table if not exists spesa_storico (
  id        bigint generated always as identity primary key,
  fatta_il  timestamptz not null default now()
);

create table if not exists spesa_storico_voce (
  id            bigint generated always as identity primary key,
  storico_id    bigint not null references spesa_storico (id) on delete cascade,
  categoria_key text,
  testo         text   not null
);

-- Ultima modifica alla lista (ex spesaMeta) — singleton.
create table if not exists spesa_meta (
  id             boolean primary key default true check (id),
  modificato_da  text,
  modificato_il  timestamptz
);

-- ============================================================================
-- 9. Allenamenti — attività + tracce (ex training/activities, training/tracks)
-- ============================================================================
create table if not exists attivita (
  id                    text primary key,   -- chiave = id intervals.icu
  data                  date,
  mese                  text,
  anno_sett             text,
  disciplina            text,
  tipo_garmin           text,
  nome                  text,
  durata_min            numeric,
  distanza_km           numeric,
  fc_media              numeric,
  carico                numeric,
  ctl                   numeric,
  atl                   numeric,
  velocita_bici_kmh     numeric,
  passo_corsa_min_km    text,
  passo_nuoto_min_100m  text,
  extra                 jsonb                -- campi variabili intervals.icu (vedi header)
);

create table if not exists traccia (
  attivita_id  text primary key references attivita (id) on delete cascade,
  versione     int,
  dislivello_m numeric,
  geo          jsonb,               -- polyline (array di [lat,lon]) — oggetto geometrico
  altimetria   jsonb                -- profilo altimetrico (array) — oggetto geometrico
);

create table if not exists traccia_salita (
  id            bigint generated always as identity primary key,
  attivita_id   text   not null references attivita (id) on delete cascade,
  ordinamento   int    not null default 0,
  durata_s      numeric,
  pendenza_media numeric,
  pendenza_max   numeric,
  fc_media      numeric,
  cadenza       numeric,
  vam           numeric,
  velocita      numeric
);

create table if not exists traccia_lap (
  id          bigint generated always as identity primary key,
  attivita_id text   not null references attivita (id) on delete cascade,
  ordinamento int    not null default 0,
  distanza_km numeric,
  durata_s    numeric,
  passo       text,
  velocita    numeric
);

-- ── Indici utili ────────────────────────────────────────────────────────────
create index if not exists idx_attivita_data       on attivita (data);
create index if not exists idx_attivita_disciplina on attivita (disciplina);
create index if not exists idx_spesa_item_cat      on spesa_item (categoria_key);
create index if not exists idx_dispensa_item_cat   on dispensa_item (categoria_key);
create index if not exists idx_nic_pasto_day       on nic_pasto (day_id);
create index if not exists idx_nic_item_pasto      on nic_item (pasto_id);

-- ============================================================================
-- 10. RLS — dati condivisi tra i membri (household). Ogni tabella: accesso pieno
--     solo agli utenti autenticati presenti in `membro`.
-- ============================================================================
create or replace function is_membro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membro m where m.user_id = auth.uid());
$$;

do $$
declare t text;
begin
  for t in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists membri_all on public.%I;', t);
    execute format(
      'create policy membri_all on public.%I for all to authenticated using (is_membro()) with check (is_membro());',
      t
    );
  end loop;
end $$;

-- ============================================================================
-- FINE. Prossimi passi: seed reference (categoria_alimentare, owner,
-- spesa_categoria, programma), poi migrazione dati da Firebase (script one-shot),
-- poi Storage buckets 'schede' (pdf) e 'schede-video'.
-- ============================================================================
